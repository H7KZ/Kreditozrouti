import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import ScraperResponseHandler from '@api/Handlers/ScraperResponseHandler'
import { ScraperRequestQueue, ScraperResponseQueue } from '@scraper/Interfaces/ScraperQueue'
import ScraperRequestJob from '@scraper/Interfaces/ScraperRequestJob'
import ScraperResponseJob from '@scraper/Interfaces/ScraperResponseJob'
import {
    Scraper4FISArchiveEventsRequestScheduler,
    Scraper4FISEventsRequestScheduler,
    Scraper4FISFlickrEventsRequestScheduler,
    ScraperInSISCatalogRequestScheduler,
    ScraperInSISStudyPlansRequestScheduler
} from '@scraper/Interfaces/ScraperSchedulers'
import { Queue, Worker } from 'bullmq'

/**
 * Manages the BullMQ infrastructure for the scraping service.
 * Handles request queues, response workers, and periodic job scheduling.
 */
const scraper = {
    queue: {
        request: new Queue<ScraperRequestJob>(ScraperRequestQueue, { connection: redis })
    },

    worker: {
        response: new Worker<ScraperResponseJob>(ScraperResponseQueue, ScraperResponseHandler, {
            connection: redis,
            concurrency: 4
        })
    },

    /**
     * Waits for all queues and workers to be ready before processing.
     */
    async waitForQueues() {
        await scraper.queue.request.waitUntilReady()
        console.log('Scraper request queue is ready.')

        await scraper.worker.response.waitUntilReady()
        console.log('Scraper response worker is ready.')
    },

    /**
     * Configures Cron-based job schedulers.
     */
    async schedulers() {
        if (!Config.isEnvLocal()) {
            // 4FIS Events (Every 2 minutes)
            await scraper.queue.request.upsertJobScheduler(
                Scraper4FISEventsRequestScheduler,
                { pattern: '*/2 * * * *' },
                {
                    name: '4FIS Events Request (*/2 min)',
                    data: {
                        type: '4FIS:Events',
                        auto_queue_events: true
                    },
                    opts: { removeOnComplete: true, removeOnFail: true }
                }
            )

            // 4FIS Archive Events (Daily at 3:00 AM)
            await scraper.queue.request.upsertJobScheduler(
                Scraper4FISArchiveEventsRequestScheduler,
                { pattern: '0 3 * * *' },
                {
                    name: '4FIS Archive Events Request (3 AM)',
                    data: {
                        type: '4FIS:Archive:Events',
                        auto_queue_events: true
                    },
                    opts: { removeOnComplete: true, removeOnFail: true }
                }
            )

            // 4FIS Flickr Events (Daily at 4:00 AM)
            await scraper.queue.request.upsertJobScheduler(
                Scraper4FISFlickrEventsRequestScheduler,
                { pattern: '0 4 * * *' },
                {
                    name: '4FIS Flickr Events Request (4 AM)',
                    data: {
                        type: '4FIS:Flickr:Events',
                        auto_queue_events: true
                    },
                    opts: { removeOnComplete: true, removeOnFail: true }
                }
            )

            // InSIS Catalog (Daily at 1:00 AM)
            await scraper.queue.request.upsertJobScheduler(
                ScraperInSISCatalogRequestScheduler,
                { pattern: '0 1 * * *' },
                {
                    name: 'InSIS Catalog Request (at 1 AM)',
                    data: {
                        type: 'InSIS:Catalog',
                        auto_queue_courses: true
                    },
                    opts: { removeOnComplete: true, removeOnFail: true }
                }
            )

            // InSIS Study Plans (Daily at 2:00 AM)
            await scraper.queue.request.upsertJobScheduler(
                ScraperInSISStudyPlansRequestScheduler,
                { pattern: '0 2 * * *' },
                {
                    name: 'InSIS Study Plans Request (at 2 AM)',
                    data: {
                        type: 'InSIS:StudyPlans',
                        auto_queue_study_plans: true,
                        auto_queue_courses: true
                    },
                    opts: { removeOnComplete: true, removeOnFail: true }
                }
            )

            // InSIS Study Plans Secondary Run (Daily at 3:15 AM)
            // Note: Using a suffix to avoid overwriting the 2:00 AM scheduler
            await scraper.queue.request.upsertJobScheduler(
                `${ScraperInSISStudyPlansRequestScheduler}:Secondary`,
                { pattern: '15 3 * * *' },
                {
                    name: 'InSIS Study Plans Request (at 3:45 AM)',
                    data: {
                        type: 'InSIS:StudyPlans',
                        auto_queue_study_plans: true,
                        auto_queue_courses: false
                    },
                    opts: { removeOnComplete: true, removeOnFail: true }
                }
            )

            console.log('BullMQ schedulers have been configured.')
        }
    }
}

export { scraper }
