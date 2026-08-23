import type { ScraperRequestJob, ScraperResponseJob } from '@kreditozrouti/types'
import type { ConnectionOptions } from 'bullmq'
import { ScraperRequestQueue, ScraperResponseQueue } from '@kreditozrouti/core/queue'
import { Queue, Worker } from 'bullmq'
import { BullMQOtel } from 'bullmq-otel'
import { redis } from '@scraper/clients'
import ScraperRequestHandler from '@scraper/Handlers/ScraperRequestHandler'
import { logger } from '@scraper/logger'

const bullmqTelemetry = new BullMQOtel({ tracerName: 'kreditozrouti-scraper' })

// Queues

// bullmq@6's Queue leaks its defaulted DefaultNameType generic across the module
// boundary, which makes Queue.add(name, ...) reject a plain string name at every
// call site. Pin the generics via a cast so the exported queue type is fully
// resolved. The connection cast bridges ioredis's RedisOptions and bullmq's own
// vendored RedisOptions, which are structurally incompatible in v6.
const requestQueue = new Queue<ScraperRequestJob>(ScraperRequestQueue, {
	connection: redis.options as ConnectionOptions,
	telemetry: bullmqTelemetry,
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: 'exponential', delay: 10_000 },
		removeOnComplete: { count: 200 },
		removeOnFail: { age: 86_400 }
	}
}) as Queue<ScraperRequestJob, unknown, string, ScraperRequestJob, unknown, string>

// attempts: 3 adds a BullMQ-level retry layer on top of withDeadlockRetry in the API handler.
// Both are safe together because response jobs use upsert semantics — re-running them is idempotent.
const responseQueue = new Queue<ScraperResponseJob>(ScraperResponseQueue, {
	connection: redis.options as ConnectionOptions,
	telemetry: bullmqTelemetry,
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: 'exponential', delay: 5_000 },
		removeOnComplete: { count: 200 },
		removeOnFail: { age: 86_400 }
	}
}) as Queue<ScraperResponseJob, unknown, string, ScraperResponseJob, unknown, string>

// Workers

const requestWorker = new Worker<ScraperRequestJob>(ScraperRequestQueue, ScraperRequestHandler, {
	connection: redis.options as ConnectionOptions,
	telemetry: bullmqTelemetry,
	concurrency: 1,
	lockDuration: 900_000, // 15 min; covers the longest expected job; auto-renewed while worker is alive
	maxStalledCount: 3 // allow 3 stall recoveries before permanent failure
})

// Scraper object

const scraper = {
	queue: {
		request: requestQueue,
		response: responseQueue
	},

	worker: {
		request: requestWorker
	},

	init(): void {
		scraper.worker.request.on('failed', (job, err) => {
			logger.error({ job_id: job?.id, job_name: job?.name, err }, 'scraper.job_permanently_failed')
		})
	},

	async waitForQueues(): Promise<void> {
		await scraper.queue.request.waitUntilReady()
		logger.info('scraper.request_queue_ready')

		await scraper.queue.response.waitUntilReady()
		logger.info('scraper.response_queue_ready')

		await scraper.worker.request.waitUntilReady()
		logger.info('scraper.request_worker_ready')
	}
}

export default scraper
