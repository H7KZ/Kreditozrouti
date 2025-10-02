import ScraperRequestJobDataInterface from '@api/Interfaces/ScraperRequestJobDataInterface'
import { Job } from 'bullmq'
import EventScraperController from '@/Controllers/EventScraperController'
import EventsScraperController from '@/Controllers/EventsScraperController'

export default async function ScraperRequestJobHandler(job: Job<ScraperRequestJobDataInterface>): Promise<void> {
    const type = job.data.type

    console.log(`New job of type ${type} with id ${job.id} added to the queue.`)

    switch (type) {
        case 'Events':
            await EventsScraperController(job.data)
            break
        case 'Event':
            await EventScraperController(job.data)
            break
        case 'EventRegister':
            // await EventRegisterScraperController(job.data)
            break
        default:
            console.warn(`Unknown job type: ${type}`)
            break
    }

    return Promise.resolve()
}
