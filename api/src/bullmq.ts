// Imports

import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import ScraperResponseHandler from '@api/Handlers/ScraperResponseHandler'
import { withSentryJobHandler } from '@api/sentry'
import InSISService from '@api/Services/InSISService'
import type { ScraperRequestJob, ScraperResponseJob } from '@shared/queue/jobs'
import { ScraperInSISCatalogRequestScheduler, ScraperInSISStudyPlansRequestScheduler, ScraperRequestQueue, ScraperResponseQueue } from '@shared/queue/names'
import { Queue, Worker } from 'bullmq'

// Queue & Worker Setup

const scraperRequestQueue = new Queue<ScraperRequestJob>(ScraperRequestQueue, {
	connection: redis.options
})

const scraperResponseWorker = new Worker<ScraperResponseJob>(ScraperResponseQueue, withSentryJobHandler(ScraperResponseQueue, ScraperResponseHandler), {
	connection: redis.options,
	concurrency: 4
})

// Scheduler Job Data

/**
 * Registration window months (with one-week early-start buffer):
 *   ZS window: June 9 – September 25  → months 6,7,8,9
 *   LS window: January 1 – February 27 → months 1,2
 *
 * Catalog runs at 3 AM, Study Plans at 2 AM — both on this month set.
 */
const REGISTRATION_MONTHS_CRON = '1,2,6,7,8,9'

function buildCatalogSchedulerJob(periodsForLastFourYears: ReturnType<typeof InSISService.getPeriodsForLastYears>) {
	return {
		name: `InSIS Catalog Request (at 3 AM during registration months)`,
		data: {
			type: 'InSIS:Catalog' as const,
			auto_queue_courses: true,
			faculties: undefined,
			periods: periodsForLastFourYears
		},
		opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
	}
}

function buildStudyPlansSchedulerJob(periodsForLastFourYears: ReturnType<typeof InSISService.getPeriodsForLastYears>) {
	return {
		name: `InSIS Study Plans Request (at 2 AM during registration months)`,
		data: {
			type: 'InSIS:StudyPlans' as const,
			auto_queue_study_plans: true,
			faculties: undefined,
			periods: periodsForLastFourYears
		},
		opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
	}
}

// Exported BullMQ Object

const scraper = {
	queue: {
		request: scraperRequestQueue
	},

	worker: {
		response: scraperResponseWorker
	},

	async waitForQueues() {
		await scraper.queue.request.waitUntilReady()
		console.log('Scraper request queue is ready.')

		await scraper.worker.response.waitUntilReady()
		console.log('Scraper response worker is ready.')
	},

	async schedulers() {
		if (!Config.isEnvProduction()) return

		// Remove legacy scheduler IDs (SupervisorScheduler was removed in favour of
		// direct month-scoped cron schedulers on the API side)
		await scraper.queue.request.removeJobScheduler('SupervisorScheduler')

		const periodsForLastFourYears = InSISService.getPeriodsForLastYears(4)

		// Catalog: daily at 3 AM during registration months
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISCatalogRequestScheduler,
			{ pattern: `0 3 * ${REGISTRATION_MONTHS_CRON} *` },
			buildCatalogSchedulerJob(periodsForLastFourYears)
		)

		// Study Plans: daily at 2 AM during registration months
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISStudyPlansRequestScheduler,
			{ pattern: `0 2 * ${REGISTRATION_MONTHS_CRON} *` },
			buildStudyPlansSchedulerJob(periodsForLastFourYears)
		)

		console.log('BullMQ schedulers have been configured.')
	}
}

export { scraper }
