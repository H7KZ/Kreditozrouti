import { QueueEnum } from '@api/Enums/QueueEnum'
import ScraperRequestJobInterface from '@api/Interfaces/ScraperRequestJobInterface'
import ScraperResponseJobInterface from '@api/Interfaces/ScraperResponseJobInterface'
import { dragonfly } from '@scraper/clients'
import ScraperRequestJobHandler from '@scraper/Handlers/ScraperRequestJobHandler'
import { Queue, Worker } from 'bullmq'

const scraper = {
    queue: {
        request: new Queue<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, { connection: dragonfly }),
        response: new Queue<ScraperResponseJobInterface>(QueueEnum.SCRAPER_RESPONSE, { connection: dragonfly })
    },
    worker: {
        request: new Worker<ScraperRequestJobInterface>(QueueEnum.SCRAPER_REQUEST, ScraperRequestJobHandler, { connection: dragonfly })
        // response: new Worker<ScraperResponseJobInterface>(QueueEnum.SCRAPER_RESPONSE, ScraperResponseJobHandler, { connection: dragonfly })
    }
}

export { scraper }
