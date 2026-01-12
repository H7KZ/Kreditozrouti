import { redis } from '@api/clients';
import Config from '@api/Config/Config';
import ScraperResponseHandler from '@api/Handlers/ScraperResponseHandler';
import { ScraperRequestQueue, ScraperResponseQueue } from '@scraper/Interfaces/ScraperQueue';
import ScraperRequestJob from '@scraper/Interfaces/ScraperRequestJob';
import ScraperResponseJob from '@scraper/Interfaces/ScraperResponseJob';
import { ScraperInSISCatalogRequestScheduler, ScraperInSISStudyPlansRequestScheduler } from '@scraper/Interfaces/ScraperSchedulers';
import { Queue, Worker } from 'bullmq';


/**
 * Manages the BullMQ infrastructure for the scraping service.
 * Handles request queues, response workers, and periodic job scheduling.
 */
const scraper = {
    queue: {
        request: new Queue<ScraperRequestJob>(ScraperRequestQueue, { connection: redis.options })
    },

    worker: {
        response: new Worker<ScraperResponseJob>(ScraperResponseQueue, ScraperResponseHandler, {
            connection: redis.options,
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
        if (Config.isEnvProduction()) {
            await scraper.queue.request.removeJobScheduler(ScraperInSISCatalogRequestScheduler)
            await scraper.queue.request.removeJobScheduler(ScraperInSISStudyPlansRequestScheduler)

            // InSIS Catalog (Daily at 1 AM in Jan,Feb,Aug,Sep)
            await scraper.queue.request.upsertJobScheduler(
                ScraperInSISCatalogRequestScheduler,
                { pattern: '0 1 * 1-2,8-9 *' },
                {
                    name: 'InSIS Catalog Request (at 1 AM in Jan, Feb, Aug, Sep)',
                    data: {
                        type: 'InSIS:Catalog',
                        auto_queue_courses: true
                    },
                    opts: { removeOnComplete: true, removeOnFail: true }
                }
            )

            // InSIS Study Plans (Daily at 2 AM in Jan,Feb,Aug,Sep)
            await scraper.queue.request.upsertJobScheduler(
                ScraperInSISStudyPlansRequestScheduler,
                { pattern: '0 2 * 1-2,8-9 *' },
                {
                    name: 'InSIS Study Plans Request (at 2 AM in Jan, Feb, Aug, Sep)',
                    data: {
                        type: 'InSIS:StudyPlans',
                        auto_queue_study_plans: true
                    },
                    opts: { removeOnComplete: true, removeOnFail: true }
                }
            )

            console.log('BullMQ schedulers have been configured.')
        }
    }
}

export { scraper }
