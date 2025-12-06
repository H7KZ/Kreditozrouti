import { redis } from '@api/clients'
import { QueueEnum } from '@api/Enums/QueueEnum'
import ScraperResponseJobHandler from '@api/Handlers/ScraperResponseJobHandler'
import ScraperRequestJobInterface from '@scraper/Interfaces/BullMQ/ScraperRequestJobInterface'
import ScraperResponseJobDataInterface from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { Queue, Worker } from 'bullmq'
import { JobEnum } from './Enums/JobEnum'

const scraper = {
    queue: {
        request: new Queue<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, { connection: redis })
        // response: new Queue<ScraperResponseJobDataInterface>(QueueEnum.SCRAPER_RESPONSE, { connection: redis })
    },
    worker: {
        // request: new Worker<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, ScraperRequestJobHandler, { connection: redis }),
        response: new Worker<ScraperResponseJobDataInterface>(QueueEnum.SCRAPER_RESPONSE, ScraperResponseJobHandler, { connection: redis, concurrency: 4 })
    },

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

    async schedulers() {
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
