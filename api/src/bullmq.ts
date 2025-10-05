import { redis } from '@api/clients'
import { QueueEnum } from '@api/Enums/QueueEnum'
import ScraperResponseJobHandler from '@api/Handlers/ScraperResponseJobHandler'
import ScraperRequestJobInterface from '@api/Interfaces/ScraperRequestJobInterface'
import ScraperResponseJobDataInterface from '@api/Interfaces/ScraperResponseJobInterface'
import { Queue, Worker } from 'bullmq'
import { JobEnum } from './Enums/JobEnum'

const scraper = {
    queue: {
        request: new Queue<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, { connection: redis })
        // response: new Queue<ScraperResponseJobDataInterface>(QueueEnum.SCRAPER_RESPONSE, { connection: redis })
    },
    worker: {
        // request: new Worker<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, ScraperRequestJobHandler, { connection: redis }),
        response: new Worker<ScraperResponseJobDataInterface>(QueueEnum.SCRAPER_RESPONSE, ScraperResponseJobHandler, { connection: redis })
    },

    async setConcurrency(concurrency: number) {
        await scraper.queue.request.setGlobalConcurrency(concurrency)
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
            'EventsRequestJobScheduler',
            { pattern: '*/2 * * * *' }, // Every 2 minutes
            {
                name: JobEnum.EVENTS_REQUEST,
                data: {
                    type: 'Events'
                },
                opts: {
                    removeOnComplete: {
                        age: 3600, // keep up to 1 hour
                        count: 100 // keep up to 100 jobs
                    },
                    removeOnFail: {
                        age: 24 * 3600 // keep up to 24 hours
                    }
                }
            }
        )
        console.log('EventsRequestJobScheduler has been set to run every 2 minutes.')
    }
}

export { scraper }
