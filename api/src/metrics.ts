import type { NextFunction, Request, Response } from 'express'
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client'
import Config from '@api/Config/Config'

/**
 * Prometheus metrics. Names, labels and buckets are the monitoring contract shared with
 * deployment/monitoring (rules, promtool tests, dashboards) and with the Ohlidame stack, so
 * renaming one here silently blanks a panel or disarms an alert there. Everything is
 * in-process: nothing is mirrored through Redis.
 */
const register = new Registry()

collectDefaultMetrics({ register })

/** Includes 0.5, 1 and 2 so every latency SLO bound is an exact `le` bucket. */
const HTTP_BUCKETS = [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120]

/** Every state `Queue.getJobCounts()` reports, in BullMQ's own vocabulary. */
const BULLMQ_STATES = ['waiting', 'active', 'delayed', 'prioritized', 'waiting-children', 'completed', 'failed'] as const

const WORKER_BUCKETS = [0.1, 0.5, 1, 5, 15, 30, 60, 120, 300, 900]

/** A request carrying any of these came through Traefik or Cloudflare. */
const PROXY_HEADERS = ['x-real-ip', 'x-forwarded-for', 'cf-connecting-ip', 'cf-ray']

new Gauge({
	name: 'app_build_info',
	help: 'Always 1; labels carry the running build',
	labelNames: ['app', 'version', 'commit'] as const,
	registers: [register]
}).set({ app: 'api', version: Config.build.version, commit: Config.build.commit }, 1)

const httpDuration = new Histogram({
	name: 'http_server_request_duration_seconds',
	help: 'HTTP server request duration in seconds',
	labelNames: ['method', 'route', 'status_code'] as const,
	buckets: HTTP_BUCKETS,
	registers: [register]
})

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
	if (req.path === '/metrics' || req.path === '/health') {
		return next()
	}
	const end = httpDuration.startTimer()
	res.on('finish', () => {
		// req.route only exists after Express matches a route, and req.route.path is
		// just the leaf pattern registered on that router - without the mount prefix
		// it collides across routers (e.g. every router's "/:id"). Prefix with
		// req.baseUrl so the label is the full mounted pattern. Unmatched requests
		// (404s, probes) have no req.route at all and share "unmatched" - low
		// cardinality is more important here than per-path 404 breakdowns.
		end({
			method: req.method,
			route: req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched',
			status_code: String(res.statusCode)
		})
	})
	next()
}

/** Answers 404 to anything that came through the proxy, so /api/metrics is never public. */
export async function metricsHandler(req: Request, res: Response): Promise<void> {
	if (PROXY_HEADERS.some(name => req.headers[name] !== undefined)) {
		res.status(404).end()
		return
	}
	res.set('Content-Type', register.contentType)
	res.send(await register.metrics())
}

/** The slice of a BullMQ `Queue` the collector reads. */
interface QueueLike {
	name: string
	getJobCounts(...types: string[]): Promise<Record<string, number>>
}

/**
 * `bullmq_job_count{queue,state}` for every queue, read at scrape time. Reported by the api
 * only (it holds both queues), so two scraper replicas never double the counts. A queue whose
 * Redis call fails is left out of that scrape rather than reported as zero.
 */
export function collectQueueCounts(queues: readonly QueueLike[]): void {
	new Gauge({
		name: 'bullmq_job_count',
		help: 'Number of jobs in the queue by state',
		labelNames: ['queue', 'state'] as const,
		registers: [register],
		async collect() {
			this.reset()
			await Promise.all(
				queues.map(async queue => {
					try {
						const counts = await queue.getJobCounts(...BULLMQ_STATES)
						for (const state of BULLMQ_STATES) this.set({ queue: queue.name, state }, counts[state] ?? 0)
					} catch {
						// Redis unreachable for this scrape: omit the queue.
					}
				})
			)
		}
	})
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

/**
 * Feeds the worker metrics from BullMQ events. Alerts use `increase(worker_jobs_total{outcome="failure"})`,
 * never the retained failed-job count, so an old failure left in the failed set does not page forever.
 */
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
