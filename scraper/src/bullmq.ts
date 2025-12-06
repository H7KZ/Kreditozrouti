import { QueueEnum } from '@api/Enums/QueueEnum'
import { redis } from '@scraper/clients'
import ScraperRequestJobHandler from '@scraper/Handlers/ScraperRequestJobHandler'
import ScraperRequestJobInterface from '@scraper/Interfaces/BullMQ/ScraperRequestJobInterface'
import ScraperResponseJobInterface from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { Queue, Worker } from 'bullmq'

/**
 * Manages the BullMQ infrastructure specifically for the scraper service.
 * Handles queue initialization and the worker responsible for executing scrape requests.
 */
const scraper = {
    /**
     * Collection of message queues for job dispatching.
     */
    queue: {
        /** Queue for receiving scraping tasks. */
        request: new Queue<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, { connection: redis }),
        /** Queue for dispatching scrape results back to the API. */
        response: new Queue<ScraperResponseJobInterface>(QueueEnum.SCRAPER_RESPONSE, { connection: redis })
    },
    /**
     * Collection of workers for processing job execution.
     */
    worker: {
        /**
         * Worker that processes incoming scrape requests.
         * Configured with concurrency: 1 to process jobs serially.
         */
        request: new Worker<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, ScraperRequestJobHandler, { connection: redis, concurrency: 1 })
        // response: new Worker<ScraperResponseJobInterface>(QueueEnum.SCRAPER_RESPONSE, ScraperResponseJobHandler, { connection: redis })
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

export { scraper }
