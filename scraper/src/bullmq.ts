import { redis } from '@scraper/clients'
import ScraperRequestHandler from '@scraper/Handlers/ScraperRequestHandler'
import { ScraperRequestQueue, ScraperResponseQueue } from '@scraper/Interfaces/ScraperQueue'
import ScraperRequestJob from '@scraper/Interfaces/ScraperRequestJob'
import ScraperResponseJob from '@scraper/Interfaces/ScraperResponseJob'
import { withSentryJobHandler } from '@scraper/sentry'
import { Queue, Worker } from 'bullmq'

/**
 * Manages the BullMQ infrastructure specifically for the scraper service.
 * Handles queue initialization and the worker responsible for executing scrape requests.
 */
const scraper = {
    queue: {
        request: new Queue<ScraperRequestJob>(ScraperRequestQueue, { connection: redis.options }),
        response: new Queue<ScraperResponseJob>(ScraperResponseQueue, { connection: redis.options })
    },

    worker: {
        request: new Worker<ScraperRequestJob>(ScraperRequestQueue, withSentryJobHandler(ScraperRequestQueue, ScraperRequestHandler), {
            connection: redis.options,
            concurrency: 1
        })
        // response: new Worker<ScraperResponseJobInterface>(ScraperResponseQueue, ScraperResponseJobHandler, { connection: redis })
    },

    /**
     * Awaits the readiness of all configured queues and workers.
     * Ensures Redis connections are established before processing begins.
     */
    async waitForQueues() {
        await scraper.queue.request.waitUntilReady()
        console.log('Scraper request queue is ready and processing jobs.')

        await scraper.queue.response.waitUntilReady()
        console.log('Scraper response queue is ready and processing jobs.')

        await scraper.worker.request.waitUntilReady()
        console.log('Scraper request worker is ready and processing jobs.')

        // await scraper.worker.response.waitUntilReady()
        // console.log('Scraper response worker is ready and processing jobs.')
    }
}

export default scraper
