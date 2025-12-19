import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import ScraperResponseHandler from '@api/Handlers/ScraperResponseHandler'
import { ScraperRequestQueue, ScraperResponseQueue } from '@scraper/bullmq'
import ScraperRequestJob from '@scraper/Interfaces/ScraperRequestJob'
import ScraperResponseJob from '@scraper/Interfaces/ScraperResponseJob'
import { Queue, Worker } from 'bullmq'

const Scraper4FISEventsRequestScheduler = 'Scraper4FISEventsRequestScheduler'
const ScraperInSISCatalogRequestScheduler = 'ScraperInSISCatalogRequestScheduler'
const ScraperInSISStudyPlansRequestScheduler = 'ScraperInSISStudyPlansRequestScheduler'

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
        request: new Queue<ScraperRequestJob>(ScraperRequestQueue, { connection: redis })
        // response: new Queue<ScraperResponseJobData>(ScraperResponseQueue, { connection: redis })
    },
    /**
     * Collection of workers for processing job execution results.
     */
    worker: {
        // request: new Worker<ScraperRequestJob>(ScraperRequestQueue, ScraperRequestJobHandler, { connection: redis }),
        /** Worker that processes responses from the scraper with a concurrency limit of 4. */
        response: new Worker<ScraperResponseJob>(ScraperResponseQueue, ScraperResponseHandler, { connection: redis, concurrency: 4 })
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
        if (!Config.isEnvDevelopment()) {
            /**
             * Schedules the FIS Events scraper to run every 2 minutes.
             */
            await scraper.queue.request.upsertJobScheduler(
                Scraper4FISEventsRequestScheduler,
                { pattern: '*/2 * * * *' }, // Every 2 minutes
                {
                    name: '4FIS Events Request (2 min)',
                    data: {
                        type: '4FIS:Events',
                        auto_queue_events: true
                    },
                    opts: {
                        removeOnComplete: true,
                        removeOnFail: {
                            age: 2 * 3600 // keep up to 2 hours
                        }
                    }
                }
            )
            console.log(`${Scraper4FISEventsRequestScheduler} has been set to run every 2 minutes.`)

            /**
             * Schedules the InSIS Catalog scraper to run daily at 1:00 am.
             */
            await scraper.queue.request.upsertJobScheduler(
                ScraperInSISCatalogRequestScheduler,
                { pattern: '0 1 * * *' }, // At 1:00 am every day
                {
                    name: 'InSIS Catalog Request (at 1 am)',
                    data: {
                        type: 'InSIS:Catalog',
                        auto_queue_courses: true
                    },
                    opts: {
                        removeOnComplete: true,
                        removeOnFail: true
                    }
                }
            )
            console.log(`${ScraperInSISCatalogRequestScheduler} has been set to run at 1:00 am daily.`)

            /**
             * Schedules the InSIS Study Plan scraper to run daily at 2:00 am.
             */
            await scraper.queue.request.upsertJobScheduler(
                ScraperInSISStudyPlansRequestScheduler,
                { pattern: '0 2 * * *' }, // At 2:00 am every day
                {
                    name: 'InSIS Study Plans Request (at 2 am)',
                    data: {
                        type: 'InSIS:StudyPlans',
                        auto_queue_study_plans: true
                    },
                    opts: {
                        removeOnComplete: true,
                        removeOnFail: true
                    }
                }
            )
            console.log(`${ScraperInSISStudyPlansRequestScheduler} has been set to run at 2:00 am daily.`)
        }
    }
}

export { Scraper4FISEventsRequestScheduler, ScraperInSISCatalogRequestScheduler, scraper }
