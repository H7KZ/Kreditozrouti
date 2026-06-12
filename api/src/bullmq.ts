import type { ScraperRequestJob, ScraperResponseJob } from '@shared/queue/jobs'
import { Queue, Worker } from 'bullmq'
import {
	ScraperInSISAcademicSchedulesRequestScheduler,
	ScraperInSISCatalogRequestScheduler,
	ScraperInSISFacultyTimetablesRequestScheduler,
	ScraperInSISGapSweeperScheduler,
	ScraperInSISStudyPlansRequestScheduler,
	ScraperRequestQueue,
	ScraperResponseQueue
} from '@shared/queue/names'
import { mysql, redis } from '@api/clients'
import Config from '@api/Config/Config'
import { StudyPlanCourseIdentTable } from '@api/Database/types'
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
	concurrency: 2
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

function buildStudyPlansSchedulerJob() {
	const periodsForLastFourYears = InSISService.getPeriodsForLastYears(4)

	return {
		name: `InSIS Study Plans Request (at 2 AM during registration months)`,
		data: {
			type: 'InSIS:StudyPlans' as const,
			faculties: undefined,
			periods: periodsForLastFourYears,
			auto_queue_study_plans: true
		},
		opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
	}
}

async function buildCatalogSchedulerJob() {
	const upcomingPeriod = InSISService.getUpcomingPeriod()
	const rows = await mysql.selectFrom(StudyPlanCourseIdentTable._table).select('course_ident').distinct().execute()
	const allowedIdents = rows.map(r => r.course_ident)

	return {
		name: 'InSIS Catalog Request (at 3 AM during registration months)',
		data: {
			type: 'InSIS:Catalog' as const,
			faculties: undefined,
			periods: [upcomingPeriod],
			allowed_idents: allowedIdents,
			auto_queue_courses: true
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

		// Study Plans: daily at 2 AM during registration months.
		// Queues individual plan jobs which queue course scrapes directly.
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISStudyPlansRequestScheduler,
			{ pattern: `0 2 * ${REGISTRATION_MONTHS_CRON} *` },
			buildStudyPlansSchedulerJob()
		)

		// Catalog: daily at 3 AM during registration months (after study plans at 2 AM).
		// Scrapes upcoming semester only; always queues discovered courses.
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISCatalogRequestScheduler,
			{ pattern: `0 3 * ${REGISTRATION_MONTHS_CRON} *` },
			await buildCatalogSchedulerJob()
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

		// Gap Sweep: every 4 hours year-round (0:00, 4:00, 8:00, 12:00, 16:00, 20:00).
		// Queries for course idents missing from insis_courses and triggers a targeted catalog scrape.
		await scraper.queue.response.upsertJobScheduler(
			ScraperInSISGapSweeperScheduler,
			{ pattern: '0 */4 * * *' },
			{
				name: 'InSIS Gap Sweep (at 0:00, 4:00, 8:00, 12:00, 16:00, 20:00)',
				data: { type: 'InSIS:GapSweep' as const },
				opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
			}
		)

		logger.info('bullmq.schedulers_configured')
	}
}

export { scraper }
