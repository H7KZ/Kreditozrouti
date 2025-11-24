import EventController from '@scraper/Controllers/EventController'
import EventsController from '@scraper/Controllers/EventsController'
import ScraperRequestJobInterface from '@scraper/Interfaces/BullMQ/ScraperRequestJobInterface'
import { Job } from 'bullmq'

export default async function ScraperRequestJobHandler(job: Job<ScraperRequestJobInterface>): Promise<void> {
    const type = job.data.type

    console.log(`Job of type ${type} with id ${job.id} started.`)

    switch (type) {
        case '4FIS:Events':
            await EventsController()
            break
        case '4FIS:Event':
            await EventController(job.data)
            break
        default:
            console.warn(`Unknown job type: ${type}`)
            break
    }

    console.log(`Job of type ${type} with id ${job.id} completed.`)
}
