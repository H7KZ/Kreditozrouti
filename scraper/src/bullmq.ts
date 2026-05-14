import { redis } from '@scraper/clients'
import ScraperRequestHandler from '@scraper/Handlers/ScraperRequestHandler'
import { withSentryJobHandler } from '@scraper/sentry'
import type { ScraperRequestJob, ScraperResponseJob } from '@scraper/types/jobs'
import { ScraperRequestQueue, ScraperResponseQueue } from '@scraper/types/queue'
import { Queue, Worker } from 'bullmq'

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

const requestWorker = new Worker<ScraperRequestJob>(ScraperRequestQueue, withSentryJobHandler(ScraperRequestQueue, ScraperRequestHandler), {
    connection: redis.options,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 }
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
            console.error(`[BullMQ] Job ${job?.name} (${job?.id}) permanently failed: ${err.message}`)
        })
    },

    async waitForQueues(): Promise<void> {
        await scraper.queue.request.waitUntilReady()
        console.log('Scraper request queue is ready and processing jobs.')

        await scraper.queue.response.waitUntilReady()
        console.log('Scraper response queue is ready and processing jobs.')

        await scraper.worker.request.waitUntilReady()
        console.log('Scraper request worker is ready and processing jobs.')
    }
}

export default scraper
