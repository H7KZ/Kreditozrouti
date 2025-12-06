import { redis } from '@api/clients'
import { QueueEnum } from '@api/Enums/QueueEnum'
import ScraperResponseJobHandler from '@api/Handlers/ScraperResponseJobHandler'
import ScraperRequestJobInterface from '@scraper/Interfaces/BullMQ/ScraperRequestJobInterface'
import ScraperResponseJobDataInterface from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { Queue, Worker } from 'bullmq'
import { JobEnum } from './Enums/JobEnum'

/**
 * Manages the BullMQ infrastructure for the scraping service.
 * Handles the initialization of request queues, response workers, and periodic job scheduling.
 */
const scraper = {
    /**
     * Collection of message queues for job dispatching.
     */
    queue: {
        /** Queue for sending scraping requests to the external scraper service. */
        request: new Queue<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, { connection: redis })
        // response: new Queue<ScraperResponseJobDataInterface>(QueueEnum.SCRAPER_RESPONSE, { connection: redis })
    },
    /**
     * Collection of workers for processing job execution results.
     */
    worker: {
        // request: new Worker<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, ScraperRequestJobHandler, { connection: redis }),
        /** Worker that processes responses from the scraper with a concurrency limit of 4. */
        response: new Worker<ScraperResponseJobDataInterface>(QueueEnum.SCRAPER_RESPONSE, ScraperResponseJobHandler, { connection: redis, concurrency: 4 })
    },

    /**
     * Awaits the readiness of all configured queues and workers.
     * Ensures connection to Redis is established before processing begins.
     */
    async waitForQueues() {
        await scraper.queue.request.waitUntilReady()
        console.log('Scraper request queue is ready and processing jobs.')

        // await scraper.queue.response.waitUntilReady()
        // console.log('Scraper response queue is ready and processing jobs.')

        // await scraper.worker.request.waitUntilReady()
        // console.log('Scraper request worker is ready and processing jobs.')

        await scraper.worker.response.waitUntilReady()
        console.log('Scraper response worker is ready and processing jobs.')
    },

    /**
     * Registers recurring (Cron-based) job schedulers.
     * Sets up periodic triggers for FIS Events and InSIS Catalog scraping.
     */
    async schedulers() {
        /**
         * Schedules the FIS Events scraper to run every 2 minutes.
         * Configures job retention policies (keep 32 jobs or up to 2 hours).
         */
        await scraper.queue.request.upsertJobScheduler(
            'FISEventsRequestJobScheduler',
            { pattern: '*/2 * * * *' }, // Every 2 minutes
            {
                name: JobEnum.FIS_EVENTS_REQUEST,
                data: {
                    type: '4FIS:Events'
                },
                opts: {
                    removeOnComplete: true,
                    removeOnFail: {
                        age: 2 * 3600, // keep up to 2 hours
                        count: 32 // keep up to 32 jobs
                    }
                }
            }
        )
        console.log('FISEventsRequestJobScheduler has been set to run every 2 minutes.')

        /**
         * Schedules the InSIS Catalog scraper to run at the start of every hour.
         */
        await scraper.queue.request.upsertJobScheduler(
            'InSISRequestJobScheduler',
            { pattern: '0 * * * *' }, // Every 1 hour
            {
                name: JobEnum.INSIS_CATALOG_REQUEST,
                data: {
                    type: 'InSIS:Catalog'
                },
                opts: {
                    removeOnComplete: true,
                    removeOnFail: {
                        age: 2 * 3600 // keep up to 2 hours
                    }
                }
            }
        )
        // await scraper.queue.request.add(JobEnum.INSIS_CATALOG_REQUEST, { type: 'InSIS:Catalog' })
        console.log('InSISRequestJobScheduler has been set to run every 1 hour.')
    }
}

export { scraper }
