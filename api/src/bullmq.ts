import { dragonfly } from '$api/clients'
import { QueueEnum } from '$api/Enums/QueueEnum'
import ScraperResponseJobHandler from '$api/Handlers/ScraperResponseJobHandler'
import ScraperRequestJobInterface from '$api/Interfaces/ScraperRequestJobInterface'
import ScraperResponseJobDataInterface from '$api/Interfaces/ScraperResponseJobInterface'
import { Queue, Worker } from 'bullmq'

const scraper = {
    queue: {
        request: new Queue<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, { connection: dragonfly })
        // response: new Queue<ScraperResponseJobDataInterface>(QueueEnum.SCRAPER_RESPONSE, { connection: dragonfly })
    },
    worker: {
        // request: new Worker<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, ScraperRequestJobHandler, { connection: dragonfly }),
        response: new Worker<ScraperResponseJobDataInterface>(QueueEnum.SCRAPER_RESPONSE, ScraperResponseJobHandler, { connection: dragonfly })
    },

    async schedulers() {
        await scraper.queue.request.waitUntilReady()
        console.log('Scraper request queue is ready and processing jobs.')
        await scraper.worker.response.waitUntilReady()
        console.log('Scraper response worker is ready and processing jobs.')

        await scraper.queue.request.upsertJobScheduler(
            'EventsRequestJobScheduler',
            { pattern: '*/2 * * * *' }, // Every 2 minutes
            {
                name: 'EventsRequestJob',
                opts: {
                    backoff: {
                        type: 'fixed',
                        delay: 5 * 60 * 1000 // 5 minutes
                    }
                }
            }
        )
        console.log('EventsRequestJobScheduler has been set to run every 2 minutes.')
    }
}

export { scraper }
