import { redis } from '@scraper/clients'
import ScraperRequestHandler from '@scraper/Handlers/ScraperRequestHandler'
import ScraperRequestJob from '@scraper/Interfaces/ScraperRequestJob'
import ScraperResponseJob from '@scraper/Interfaces/ScraperResponseJob'
import { Queue, Worker } from 'bullmq'

const ScraperRequestQueue = 'ScraperRequestQueue'
const ScraperResponseQueue = 'ScraperResponseQueue'

/**
 * Manages the BullMQ infrastructure specifically for the scraper service.
 * Handles queue initialization and the worker responsible for executing scrape requests.
 */
const scraper = {
    queue: {
        request: new Queue<ScraperRequestJob>(ScraperRequestQueue, { connection: redis }),
        response: new Queue<ScraperResponseJob>(ScraperResponseQueue, { connection: redis })
    },

    worker: {
        request: new Worker<ScraperRequestJob>(ScraperRequestQueue, ScraperRequestHandler, { connection: redis, concurrency: 1 })
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

export { ScraperRequestQueue, ScraperResponseQueue, scraper }
