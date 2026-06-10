// Imports

import type { ScraperRequestJob, ScraperResponseJob } from '@shared/queue/jobs'
import { Queue, Worker } from 'bullmq'
import {
	ScraperInSISAcademicSchedulesRequestScheduler,
	ScraperInSISFacultyTimetablesRequestScheduler,
	ScraperInSISStudyPlansRequestScheduler,
	ScraperRequestQueue,
	ScraperResponseQueue
} from '@shared/queue/names'
import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import ScraperResponseHandler from '@api/Handlers/ScraperResponseHandler'
import { logger, withJobLogger } from '@api/logger'
import InSISService from '@api/Services/InSISService'

// Queue & Worker Setup

const scraperRequestQueue = new Queue<ScraperRequestJob>(ScraperRequestQueue, {
	connection: redis.options
})

const scraperResponseQueue = new Queue<ScraperResponseJob>(ScraperResponseQueue, {
	connection: redis.options
})

const scraperResponseWorker = new Worker<ScraperResponseJob>(ScraperResponseQueue, withJobLogger(ScraperResponseQueue, ScraperResponseHandler), {
	connection: redis.options,
	concurrency: 4
})

// Scheduler Job Data

/**
 * Registration window months (with one-week early-start buffer):
 *   ZS window: June 9 to September 25 - months 6,7,8,9
 *   LS window: January 1 to February 27 - months 1,2
 *
 * Study Plans runs at 2 AM during registration months.
 * It queues individual plan jobs which in turn queue course scrapes directly
 * no separate catalog scheduler needed.
 */
const REGISTRATION_MONTHS_CRON = '1,2,6,7,8,9'

function buildStudyPlansSchedulerJob(periodsForLastFourYears: ReturnType<typeof InSISService.getPeriodsForLastYears>) {
	return {
		name: `InSIS Study Plans Request (at 2 AM during registration months)`,
		data: {
			type: 'InSIS:StudyPlans' as const,
			auto_queue_study_plans: true,
			auto_queue_courses: true,
			faculties: undefined,
			periods: periodsForLastFourYears
		},
		opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
	}
}

// Exported BullMQ Object

const scraper = {
	queue: {
		request: scraperRequestQueue,
		response: scraperResponseQueue
	},

	worker: {
		response: scraperResponseWorker
	},

	async waitForQueues() {
		await scraper.queue.request.waitUntilReady()
		logger.info('bullmq.request_queue_ready')

		await scraper.queue.response.waitUntilReady()
		logger.info('bullmq.response_queue_ready')

		await scraper.worker.response.waitUntilReady()
		logger.info('bullmq.response_worker_ready')
	},

	async schedulers() {
		if (!Config.isEnvProduction()) return

		const periodsForLastFourYears = InSISService.getPeriodsForLastYears(4)

		// Study Plans: daily at 2 AM during registration months.
		// Queues individual plan jobs which queue course scrapes directly.
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISStudyPlansRequestScheduler,
			{ pattern: `0 2 * ${REGISTRATION_MONTHS_CRON} *` },
			buildStudyPlansSchedulerJob(periodsForLastFourYears)
		)

		// Academic Schedules: daily at 1 AM year-round
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISAcademicSchedulesRequestScheduler,
			{ pattern: '0 1 * * *' },
			{
				name: 'InSIS Academic Schedules Request (daily at 1 AM)',
				data: {
					type: 'InSIS:AcademicSchedules' as const
				},
				opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
			}
		)

		// Faculty Timetables: weekly on Sunday at midnight, year-round
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISFacultyTimetablesRequestScheduler,
			{ pattern: '0 0 * * 0' },
			{
				name: 'InSIS Faculty Timetables Request (weekly Sunday midnight)',
				data: {
					type: 'InSIS:FacultyTimetables' as const
				},
				opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
			}
		)

		logger.info('bullmq.schedulers_configured')
	}
}

export { scraper }
