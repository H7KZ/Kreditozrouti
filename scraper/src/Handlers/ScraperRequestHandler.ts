import ScraperRequestJob from '@scraper/Interfaces/ScraperRequestJob'
import ScraperRequest4FISArchiveEventsJob from '@scraper/Jobs/ScraperRequest4FISArchiveEventsJob'
import ScraperRequest4FISEventJob from '@scraper/Jobs/ScraperRequest4FISEventJob'
import ScraperRequest4FISEventsJob from '@scraper/Jobs/ScraperRequest4FISEventsJob'
import ScraperRequest4FISFlickrEventJob from '@scraper/Jobs/ScraperRequest4FISFlickrEventJob'
import ScraperRequest4FISFlickrEventsJob from '@scraper/Jobs/ScraperRequest4FISFlickrEventsJob'
import ScraperRequestInSISCatalogJob from '@scraper/Jobs/ScraperRequestInSISCatalogJob'
import ScraperRequestInSISCourseJob from '@scraper/Jobs/ScraperRequestInSISCourseJob'
import ScraperRequestInSISStudyPlanJob from '@scraper/Jobs/ScraperRequestInSISStudyPlanJob'
import ScraperRequestInSISStudyPlansJob from '@scraper/Jobs/ScraperRequestInSISStudyPlansJob'
import { Job } from 'bullmq'

/**
 * Entry point for processing scraper request jobs.
 * Routes execution to specific job processors based on the job type defined in the payload.
 * Measures and logs the execution duration for performance monitoring.
 *
 * @param job - The BullMQ job object containing the scrape request configuration.
 * @throws Propagates exceptions to trigger BullMQ retry logic or failure handling.
 */
export default async function ScraperRequestHandler(job: Job<ScraperRequestJob>): Promise<void> {
    const { type } = job.data

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
            case '4FIS:Archive:Events':
                await ScraperRequest4FISArchiveEventsJob(job.data)
                break
            case '4FIS:Flickr:Events':
                await ScraperRequest4FISFlickrEventsJob(job.data)
                break
            case '4FIS:Flickr:Event':
                await ScraperRequest4FISFlickrEventJob(job.data)
                break
            case 'InSIS:Catalog':
                await ScraperRequestInSISCatalogJob(job.data)
                break
            case 'InSIS:Course':
                await ScraperRequestInSISCourseJob(job.data)
                break
            case 'InSIS:StudyPlans':
                await ScraperRequestInSISStudyPlansJob(job.data)
                break
            case 'InSIS:StudyPlan':
                await ScraperRequestInSISStudyPlanJob(job.data)
                break
            default:
                console.warn(`Unknown job type received: ${type}`)
                break
        }

        const duration = (performance.now() - benchmark).toFixed(4)
        console.log(`Job Id ${job.id} (${type}) completed in ${duration} ms.`)
    } catch (error) {
        const duration = (performance.now() - benchmark).toFixed(4)
        console.error(`Job Id ${job.id} (${type}) failed after ${duration} ms.`, error)
        throw error
    }
}
