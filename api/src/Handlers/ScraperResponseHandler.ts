import type { ScraperResponseJob } from '@shared/queue/jobs'
import { Job } from 'bullmq'
import { redis } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import { withDeadlockRetry } from '@api/Jobs/helpers'
import ScraperResponseInSISAcademicScheduleJob from '@api/Jobs/ScraperResponseInSISAcademicScheduleJob'
import ScraperResponseInSISCourseJob from '@api/Jobs/ScraperResponseInSISCourseJob'
import ScraperResponseInSISFacultyTimetableJob from '@api/Jobs/ScraperResponseInSISFacultyTimetableJob'
import ScraperResponseInSISGapSweepJob from '@api/Jobs/ScraperResponseInSISGapSweepJob'
import ScraperResponseInSISStudyPlanJob from '@api/Jobs/ScraperResponseInSISStudyPlanJob'

const REAL_WORK_TYPES = ['InSIS:Course', 'InSIS:StudyPlan', 'InSIS:AcademicSchedule', 'InSIS:FacultyTimetable', 'InSIS:GapSweep'] as const

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
			await withDeadlockRetry(async () => {
				switch (type) {
					case 'InSIS:Course':
						await ScraperResponseInSISCourseJob(job.data)
						break
					case 'InSIS:StudyPlan':
						await ScraperResponseInSISStudyPlanJob(job.data)
						break
					case 'InSIS:AcademicSchedule':
						await ScraperResponseInSISAcademicScheduleJob(job.data)
						break
					case 'InSIS:FacultyTimetable':
						await ScraperResponseInSISFacultyTimetableJob(job.data)
						break
					case 'InSIS:GapSweep':
						await ScraperResponseInSISGapSweepJob(job.data)
						break
					case 'InSIS:Catalog':
					case 'InSIS:StudyPlans':
					case 'InSIS:AcademicSchedules':
						break
					default:
						LoggerJobContext.add({ status: 'skipped', reason: 'unknown_type' })
						break
				}
			})

			if ((REAL_WORK_TYPES as readonly string[]).includes(type)) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const noop = (_e: unknown) => {
					/* empty */
				}
				redis.incr(`metrics:scraper:items_processed:${type}:success`).catch(noop)
				redis.set(`metrics:scraper:last_run:${type}`, Math.floor(Date.now() / 1000)).catch(noop)
			}

			const diff = process.hrtime(start)
			const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6

			LoggerJobContext.add({
				status: 'success',
				duration_ms: durationMs
			})

			LoggerJobContext.log.info(LoggerJobContext.get())
		} catch (error) {
			if ((REAL_WORK_TYPES as readonly string[]).includes(type)) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const noop = (_e: unknown) => {
					/* empty */
				}
				redis.incr(`metrics:scraper:items_processed:${type}:failure`).catch(noop)
			}

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
