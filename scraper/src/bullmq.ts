import type { ScraperRequestJob, ScraperResponseJob } from '@scraper/types/jobs'
import { Queue, Worker } from 'bullmq'
import { redis } from '@scraper/clients'
import ScraperRequestHandler from '@scraper/Handlers/ScraperRequestHandler'
import { logger } from '@scraper/logger'
import { ScraperRequestQueue, ScraperResponseQueue } from '@scraper/types/queue'

// Queues

const requestQueue = new Queue<ScraperRequestJob>(ScraperRequestQueue, {
    connection: redis.options,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 }
    }
})
const responseQueue = new Queue<ScraperResponseJob>(ScraperResponseQueue, { connection: redis.options })

// Workers

const requestWorker = new Worker<ScraperRequestJob>(ScraperRequestQueue, ScraperRequestHandler, {
    connection: redis.options,
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
