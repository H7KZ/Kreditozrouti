import ScraperRequestJob from '@scraper/Interfaces/ScraperRequestJob'
import ScraperRequest4FISEventJob from '@scraper/Jobs/ScraperRequest4FISEventJob'
import ScraperRequest4FISEventsJob from '@scraper/Jobs/ScraperRequest4FISEventsJob'
import ScraperRequestInSISCatalogJob from '@scraper/Jobs/ScraperRequestInSISCatalogJob'
import ScraperRequestInSISCourseJob from '@scraper/Jobs/ScraperRequestInSISCourseJob'
import { Job } from 'bullmq'

/**
 * Entry point for processing scraper request jobs.
 * Routes execution to specific controllers based on the job type definition.
 *
 * @param job - The BullMQ job object containing the scrape request configuration.
 * @throws Re-throws exceptions to trigger BullMQ failure handling.
 */
export default async function ScraperRequestHandler(job: Job<ScraperRequestJob>): Promise<void> {
    const type = job.data.type

    console.log(`Processing job of type ${type} with id ${job.id}...`)

    const benchmark = performance.now()

    try {
        switch (type) {
            case '4FIS:Events':
                await ScraperRequest4FISEventsJob(job.data)
                break
            case '4FIS:Event':
                await ScraperRequest4FISEventJob(job.data)
                break
            case 'InSIS:Catalog':
                await ScraperRequestInSISCatalogJob(job.data)
                break
            case 'InSIS:Course':
                await ScraperRequestInSISCourseJob(job.data)
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
