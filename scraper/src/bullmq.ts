import { QueueEnum } from '@api/Enums/QueueEnum'
import { Queue, Worker } from 'bullmq'
import { dragonfly } from '@/clients'
import ScraperRequestJobHandler from '@/Handlers/ScraperRequestJobHandler'

const request = new Worker(QueueEnum.SCRAPER_REQUEST, ScraperRequestJobHandler, { connection: dragonfly })

const response = new Queue(QueueEnum.SCRAPER_RESPONSE, { connection: dragonfly })

export { request, response }
