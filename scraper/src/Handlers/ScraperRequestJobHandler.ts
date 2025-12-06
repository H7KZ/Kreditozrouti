import FISEventController from '@scraper/Controllers/FIS/FISEventController'
import FISEventsController from '@scraper/Controllers/FIS/FISEventsController'
import InSISCatalogController from '@scraper/Controllers/InSIS/InSISCatalogController'
import InSISCourseController from '@scraper/Controllers/InSIS/InSISCourseController'
import ScraperRequestJobInterface from '@scraper/Interfaces/BullMQ/ScraperRequestJobInterface'
import { Job } from 'bullmq'

export default async function ScraperRequestJobHandler(job: Job<ScraperRequestJobInterface>): Promise<void> {
    const type = job.data.type

    console.log(`Job of type ${type} with id ${job.id} started.`)

    const benchmark = performance.now()

    try {
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
            case 'InSIS:Course':
                await InSISCourseController(job.data)
                break
            default:
                console.warn(`Unknown job type: ${type}`)
                break
        }

        console.log(`Job Id ${job.id} of type ${type} took ${(performance.now() - benchmark).toFixed(4)} ms to complete.`)
        console.log(`Job of type ${type} with id ${job.id} completed.`)
    } catch (error) {
        console.log(`Job Id ${job.id} of type ${type} failed after ${(performance.now() - benchmark).toFixed(4)} ms.`)
        console.error(`Error processing job of type ${type} with id ${job.id}:`, error)
        throw error
    }
}
