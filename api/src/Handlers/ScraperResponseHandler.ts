import ScraperResponse4FISEventJob from '@api/Jobs/ScraperResponse4FISEventJob'
import ScraperResponseInSISCourseJob from '@api/Jobs/ScraperResponseInSISCourseJob'
import ScraperResponseInSISStudyPlanJob from '@api/Jobs/ScraperResponseInSISStudyPlanJob'
import ScraperResponseJob from '@scraper/Interfaces/ScraperResponseJob'
import { Job } from 'bullmq'

/**
 * Main entry point for processing scraper response jobs.
 * Routes jobs to specific handlers based on the job type and logs execution time.
 *
 * @param job - The BullMQ job object containing the scraper response data.
 * @throws Propagates exceptions to trigger BullMQ retry logic.
 */
export default async function ScraperResponseHandler(job: Job<ScraperResponseJob>): Promise<void> {
    const { type } = job.data

    console.log(`Job of type ${type} with id ${job.id} started.`)
    const benchmark = performance.now()

    try {
        switch (type) {
            case '4FIS:Event':
                await ScraperResponse4FISEventJob(job.data)
                break
            case 'InSIS:Course':
                await ScraperResponseInSISCourseJob(job.data)
                break
            case 'InSIS:StudyPlan':
                await ScraperResponseInSISStudyPlanJob(job.data)
                break

            // Types currently handled without specific DB sync logic
            case '4FIS:Events':
            case '4FIS:Archive:Events':
            case '4FIS:Flickr:Events':
            case '4FIS:Flickr:Event':
            case 'InSIS:Catalog':
            case 'InSIS:StudyPlans':
                break

            default:
                console.warn(`Unknown job type: ${type}`)
                break
        }

        const duration = (performance.now() - benchmark).toFixed(4)
        console.log(`Job Id ${job.id} of type ${type} completed in ${duration} ms.`)
    } catch (error) {
        const duration = (performance.now() - benchmark).toFixed(4)
        console.error(`Job Id ${job.id} of type ${type} failed after ${duration} ms.`, error)
        throw error
    }
}
