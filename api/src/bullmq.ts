import { Queue, Worker } from 'bullmq'
import { dragonfly } from '@/clients'
import { QueueEnum } from '@/Enums/QueueEnum'
import ScraperResponseJobHandler from '@/Handlers/ScraperResponseJobHandler'

const scraper = {
    request: new Queue(QueueEnum.SCRAPER_REQUEST, { connection: dragonfly }),
    response: new Worker(QueueEnum.SCRAPER_RESPONSE, ScraperResponseJobHandler, { connection: dragonfly })
}

export { scraper }
