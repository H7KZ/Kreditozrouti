import type { ScraperRequestJob, ScraperResponseJob } from '@shared/queue/jobs'
import { Queue, Worker } from 'bullmq'
import { BullMQOtel } from 'bullmq-otel'
import { ScraperRequestQueue, ScraperResponseQueue } from '@shared/queue/names'
import { redis } from '@scraper/clients'
import ScraperRequestHandler from '@scraper/Handlers/ScraperRequestHandler'
import { logger } from '@scraper/logger'

const bullmqTelemetry = new BullMQOtel({ tracerName: 'kreditozrouti-scraper' })

// Queues

const requestQueue = new Queue<ScraperRequestJob>(ScraperRequestQueue, {
	connection: redis.options,
	telemetry: bullmqTelemetry,
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: 'exponential', delay: 10_000 },
		removeOnComplete: { count: 200 },
		removeOnFail: { age: 86_400 }
	}
})

// attempts: 3 adds a BullMQ-level retry layer on top of withDeadlockRetry in the API handler.
// Both are safe together because response jobs use upsert semantics — re-running them is idempotent.
const responseQueue = new Queue<ScraperResponseJob>(ScraperResponseQueue, {
	connection: redis.options,
	telemetry: bullmqTelemetry,
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: 'exponential', delay: 5_000 },
		removeOnComplete: { count: 200 },
		removeOnFail: { age: 86_400 }
	}
})

// Workers

const requestWorker = new Worker<ScraperRequestJob>(ScraperRequestQueue, ScraperRequestHandler, {
	connection: redis.options,
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
