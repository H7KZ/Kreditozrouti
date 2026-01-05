import LoggerJobContext from '@api/Context/LoggerJobContext'
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
    const start = process.hrtime()

    const log = {
        job_id: job.id,
        job_name: job.name,
        queue_name: job.queueName,
        attempt: job.attemptsMade + 1,
        job_type: type,
        timestamp: new Date().toISOString()
    }

    await LoggerJobContext.run(async () => {
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
                    LoggerJobContext.add({ status: 'skipped', reason: 'unknown_type' })
                    break
            }

            const diff = process.hrtime(start)
            const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6

            LoggerJobContext.add({
                status: 'success',
                duration_ms: durationMs
            })

            LoggerJobContext.log.info(LoggerJobContext.get())
        } catch (error) {
            const diff = process.hrtime(start)
            const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6

            LoggerJobContext.add({
                status: 'failed',
                duration_ms: durationMs
            })

            if (error instanceof Error) {
                LoggerJobContext.add({
                    error_message: error.message,
                    error_type: error.name
                })
            }

            LoggerJobContext.log.error(LoggerJobContext.get())

            throw error
        }
    }, log)
}
