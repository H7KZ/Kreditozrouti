import ScraperResponse4FISEventJob from '@api/Jobs/ScraperResponse4FISEventJob'
import ScraperResponseInSISCourseJob from '@api/Jobs/ScraperResponseInSISCourseJob'
import ScraperResponseInSISStudyPlanJob from '@api/Jobs/ScraperResponseInSISStudyPlanJob'
import ScraperResponseJob from '@scraper/Interfaces/ScraperResponseJob'
import { Job } from 'bullmq'

/**
 * Entry point for processing scraper response jobs from the queue.
 * Routes jobs to specific handlers based on the defined job type and tracks execution time.
 *
 * @param job - The BullMQ job object containing the scraper response data.
 * @throws Re-throws exceptions to trigger BullMQ retry logic or failure states.
 */
export default async function ScraperResponseHandler(job: Job<ScraperResponseJob>): Promise<void> {
    const type = job.data.type

    console.log(`Job of type ${type} with id ${job.id} started.`)

    const benchmark = performance.now()

    try {
        switch (type) {
            case '4FIS:Events':
                break
            case '4FIS:Event':
                await ScraperResponse4FISEventJob(job.data)
                break
            case 'InSIS:Catalog':
                break
            case 'InSIS:Course':
                await ScraperResponseInSISCourseJob(job.data)
                break
            case 'InSIS:StudyPlans':
                break
            case 'InSIS:StudyPlan':
                await ScraperResponseInSISStudyPlanJob(job.data)
                break
            default:
                console.warn(`Unknown job type: ${type}`)
                break
        }

        console.log(`Job Id ${job.id} of type ${type} took ${(performance.now() - benchmark).toFixed(4)} ms to complete.`)
        console.log(`Job of type ${type} with id ${job.id} completed.`)
    } catch (error) {
        console.log(`Job Id ${job.id} of type ${type} failed after ${(performance.now() - benchmark).toFixed(4)} ms.`)
        console.error(`Job of type ${type} with id ${job.id} failed with error:`, error)
        throw error
    }
}
