import type { ScraperRequestJob } from '@scraper/types/jobs'
import { DelayedError, Job } from 'bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { InSISRateLimitError } from '@scraper/Errors/InSISErrors'
import ScraperRequestInSISAcademicScheduleJob from '@scraper/Jobs/ScraperRequestInSISAcademicScheduleJob'
import ScraperRequestInSISAcademicSchedulesJob from '@scraper/Jobs/ScraperRequestInSISAcademicSchedulesJob'
import ScraperRequestInSISCatalogJob from '@scraper/Jobs/ScraperRequestInSISCatalogJob'
import ScraperRequestInSISCourseJob from '@scraper/Jobs/ScraperRequestInSISCourseJob'
import ScraperRequestInSISFacultyTimetableJob from '@scraper/Jobs/ScraperRequestInSISFacultyTimetableJob'
import ScraperRequestInSISFacultyTimetablesJob from '@scraper/Jobs/ScraperRequestInSISFacultyTimetablesJob'
import ScraperRequestInSISStudyPlanJob from '@scraper/Jobs/ScraperRequestInSISStudyPlanJob'
import ScraperRequestInSISStudyPlansJob from '@scraper/Jobs/ScraperRequestInSISStudyPlansJob'

/**
 * Entry point for processing scraper request jobs.
 * Routes execution to specific job processors based on the job type defined in the payload.
 * Measures and logs the execution duration for performance monitoring.
 *
 * @param job - The BullMQ job object containing the scrape request configuration.
 * @throws Propagates exceptions to trigger BullMQ retry logic or failure handling.
 */
export default async function ScraperRequestHandler(job: Job<ScraperRequestJob>, token?: string): Promise<void> {
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

    const handlers = new Map<string, (job: Job<ScraperRequestJob>) => Promise<unknown>>([
        ['InSIS:Catalog', job => ScraperRequestInSISCatalogJob(job.data as Parameters<typeof ScraperRequestInSISCatalogJob>[0])],
        ['InSIS:Course', job => ScraperRequestInSISCourseJob(job.data as Parameters<typeof ScraperRequestInSISCourseJob>[0])],
        ['InSIS:StudyPlans', job => ScraperRequestInSISStudyPlansJob(job.data as Parameters<typeof ScraperRequestInSISStudyPlansJob>[0])],
        ['InSIS:StudyPlan', job => ScraperRequestInSISStudyPlanJob(job.data as Parameters<typeof ScraperRequestInSISStudyPlanJob>[0])],
        ['InSIS:AcademicSchedules', job => ScraperRequestInSISAcademicSchedulesJob(job.data as Parameters<typeof ScraperRequestInSISAcademicSchedulesJob>[0])],
        ['InSIS:AcademicSchedule', job => ScraperRequestInSISAcademicScheduleJob(job.data as Parameters<typeof ScraperRequestInSISAcademicScheduleJob>[0])],
        ['InSIS:FacultyTimetables', job => ScraperRequestInSISFacultyTimetablesJob(job.data as Parameters<typeof ScraperRequestInSISFacultyTimetablesJob>[0])],
        ['InSIS:FacultyTimetable', job => ScraperRequestInSISFacultyTimetableJob(job.data as Parameters<typeof ScraperRequestInSISFacultyTimetableJob>[0])]
    ])

    await LoggerJobContext.run(async () => {
        try {
            const handler = handlers.get(type)

            if (!handler) {
                LoggerJobContext.add({ status: 'skipped', reason: 'unknown_type' })
                return
            }

            await handler(job)

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

            if (error instanceof InSISRateLimitError) {
                LoggerJobContext.add({ rate_limited: true, retry_after_seconds: error.retryAfterSeconds })
                LoggerJobContext.log.warn(LoggerJobContext.get())
                await job.moveToDelayed(Date.now() + error.retryAfterSeconds * 1000, token)
                throw new DelayedError()
            }

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
