import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ScraperRequestJob from '@scraper/Interfaces/ScraperRequestJob'
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
    const start = process.hrtime()

    const log = {
        job_id: job.id,
        job_name: job.name,
        job_type: type,
        queue_name: job.queueName,
        attempt: job.attemptsMade + 1,
        timestamp: new Date().toISOString()
    }

    await LoggerJobContext.run(async () => {
        try {
            switch (type) {
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
