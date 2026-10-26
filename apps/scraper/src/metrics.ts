import { createServer } from 'http'
import type { Server } from 'http'
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client'
import Config from '@scraper/Config/Config'
import { logger } from '@scraper/logger'

/**
 * Prometheus metrics for one scraper replica, served on its own port (`Config.metricsPort`) and
 * scraped per container by the monitoring stack's Alloy. Names and labels are the monitoring
 * contract shared with deployment/monitoring and the Ohlidame stack. Everything is in-process:
 * nothing is mirrored through Redis, so a replica's counters reset when it restarts, which
 * `increase()` in the rules already handles.
 */
const register = new Registry()

collectDefaultMetrics({ register })

const WORKER_BUCKETS = [0.1, 0.5, 1, 5, 15, 30, 60, 120, 300, 900]

/** A request carrying any of these came through Traefik or Cloudflare. */
const PROXY_HEADERS = ['x-real-ip', 'x-forwarded-for', 'cf-connecting-ip', 'cf-ray']

new Gauge({
	name: 'app_build_info',
	help: 'Always 1; labels carry the running build',
	labelNames: ['app', 'version', 'commit'] as const,
	registers: [register]
}).set({ app: 'scraper', version: Config.build.version, commit: Config.build.commit }, 1)

const silentFailures = new Counter({
	name: 'scraper_silent_failures_total',
	help: 'Caught acquisition errors that did not fail the job',
	labelNames: ['job_type'] as const,
	registers: [register]
})

/** A job that caught an InSIS error and returned null: BullMQ sees success, so this is the only trace. */
export function recordSilentFailure(jobType: 'catalog' | 'course' | 'study_plan' | 'study_plans'): void {
	silentFailures.inc({ job_type: jobType })
}

const workerJobs = new Counter({
	name: 'worker_jobs_total',
	help: 'Jobs finished by the worker, by outcome',
	labelNames: ['queue', 'job_name', 'outcome'] as const,
	registers: [register]
})

const workerJobDuration = new Histogram({
	name: 'worker_job_duration_seconds',
	help: 'Job processing time in seconds (processedOn to finishedOn)',
	labelNames: ['queue', 'job_name'] as const,
	buckets: WORKER_BUCKETS,
	registers: [register]
})

const workerLastSuccess = new Gauge({
	name: 'worker_last_success_timestamp_seconds',
	help: 'Unix time in seconds of the last successful job',
	labelNames: ['queue', 'job_name'] as const,
	registers: [register]
})

interface JobLike {
	name: string
	processedOn?: number
	finishedOn?: number
}

interface WorkerLike {
	name: string
	on(event: 'completed', listener: (job: JobLike) => void): unknown
	on(event: 'failed', listener: (job: JobLike | undefined) => void): unknown
}

/** Feeds the worker metrics from BullMQ events. Call once per Worker instance. */
export function instrumentWorker(worker: WorkerLike): void {
	const observe = (job: JobLike): void => {
		if (job.processedOn && job.finishedOn && job.finishedOn >= job.processedOn) {
			workerJobDuration.observe({ queue: worker.name, job_name: job.name }, (job.finishedOn - job.processedOn) / 1000)
		}
	}
	worker.on('completed', job => {
		workerJobs.inc({ queue: worker.name, job_name: job.name, outcome: 'success' })
		workerLastSuccess.set({ queue: worker.name, job_name: job.name }, Date.now() / 1000)
		observe(job)
	})
	worker.on('failed', job => {
		workerJobs.inc({ queue: worker.name, job_name: job?.name ?? 'unknown', outcome: 'failure' })
		if (job) observe(job)
	})
}

/** Serves `GET /metrics`. The scraper has no Traefik router; the proxy check keeps it internal even if one is added. */
export function startMetricsServer(port: number): Server {
	const server = createServer((req, res) => {
		if (req.url !== '/metrics' || req.method !== 'GET' || PROXY_HEADERS.some(name => req.headers[name] !== undefined)) {
			res.writeHead(404).end()
			return
		}
		register.metrics().then(
			body => res.writeHead(200, { 'Content-Type': register.contentType }).end(body),
			() => res.writeHead(500).end()
		)
	})
	server.listen(port, () => logger.info({ port }, 'scraper.metrics_listening'))
	return server
}
