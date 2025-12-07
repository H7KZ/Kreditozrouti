import FISEventController from '@scraper/Controllers/FIS/FISEventController'
import FISEventsController from '@scraper/Controllers/FIS/FISEventsController'
import InSISCatalogController from '@scraper/Controllers/InSIS/InSISCatalogController'
import ScraperRequestJobInterface from '@scraper/Interfaces/BullMQ/ScraperRequestJobInterface'
import { Job } from 'bullmq'

export default async function ScraperRequestJobHandler(job: Job<ScraperRequestJobInterface>): Promise<void> {
    const type = job.data.type

    console.log(`Job of type ${type} with id ${job.id} started.`)

    switch (type) {
        case '4FIS:Events':
            await FISEventsController()
            break
        case '4FIS:Event':
            await FISEventController(job.data)
            break
        case 'InSIS:Catalog':
            await InSISCatalogController()
            break
        default:
            console.warn(`Unknown job type: ${type}`)
            break
    }

    console.log(`Job of type ${type} with id ${job.id} completed.`)
}
