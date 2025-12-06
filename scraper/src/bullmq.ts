import { QueueEnum } from '@api/Enums/QueueEnum'
import { redis } from '@scraper/clients'
import ScraperRequestJobHandler from '@scraper/Handlers/ScraperRequestJobHandler'
import ScraperRequestJobInterface from '@scraper/Interfaces/BullMQ/ScraperRequestJobInterface'
import ScraperResponseJobInterface from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { Queue, Worker } from 'bullmq'

const scraper = {
    queue: {
        request: new Queue<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, { connection: redis }),
        response: new Queue<ScraperResponseJobInterface>(QueueEnum.SCRAPER_RESPONSE, { connection: redis })
    },
    worker: {
        request: new Worker<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, ScraperRequestJobHandler, { connection: redis, concurrency: 1 })
        // response: new Worker<ScraperResponseJobInterface>(QueueEnum.SCRAPER_RESPONSE, ScraperResponseJobHandler, { connection: redis })
    },

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
