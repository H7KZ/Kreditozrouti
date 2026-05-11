// ─── Imports ─────────────────────────────────────────────────────────────────

import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import ScraperResponseHandler from '@api/Handlers/ScraperResponseHandler'
import { withSentryJobHandler } from '@api/sentry'
import InSISService from '@api/Services/InSISService'
import type { ScraperRequestJob, ScraperResponseJob } from '@shared/queue/jobs'
import { ScraperInSISCatalogRequestScheduler, ScraperInSISStudyPlansRequestScheduler, ScraperRequestQueue, ScraperResponseQueue } from '@shared/queue/names'
import { Queue, Worker } from 'bullmq'

// ─── Queue & Worker Setup ─────────────────────────────────────────────────────

const scraperRequestQueue = new Queue<ScraperRequestJob>(ScraperRequestQueue, {
	connection: redis.options
})

const scraperResponseWorker = new Worker<ScraperResponseJob>(ScraperResponseQueue, withSentryJobHandler(ScraperResponseQueue, ScraperResponseHandler), {
	connection: redis.options,
	concurrency: 4
})

// ─── Scheduler Job Data ───────────────────────────────────────────────────────

function buildCatalogSchedulerJob(upcomingPeriod: ReturnType<typeof InSISService.getUpcomingPeriod>) {
	return {
		name: 'InSIS Catalog Request (at 1 AM in Jan, Feb, Aug, Sep)',
		data: {
			type: 'InSIS:Catalog' as const,
			auto_queue_courses: true,
			faculties: undefined,
			periods: [upcomingPeriod]
		},
		opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
	}
}

function buildStudyPlansSchedulerJob(periodsForLastFourYears: ReturnType<typeof InSISService.getPeriodsForLastYears>) {
	return {
		name: 'InSIS Study Plans Request (at 2 AM in Jan, Feb, Aug, Sep)',
		data: {
			type: 'InSIS:StudyPlans' as const,
			auto_queue_study_plans: true,
			faculties: undefined,
			periods: periodsForLastFourYears
		},
		opts: { removeOnComplete: true, removeOnFail: { age: 86400 } }
	}
}

// ─── Exported BullMQ Object ───────────────────────────────────────────────────

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

		await scraper.queue.request.removeJobScheduler(ScraperInSISCatalogRequestScheduler)
		await scraper.queue.request.removeJobScheduler(ScraperInSISStudyPlansRequestScheduler)

		const upcomingPeriod = InSISService.getUpcomingPeriod()
		const periodsForLastFourYears = InSISService.getPeriodsForLastYears(4)

		// Daily at 1 AM in Jan, Feb, Aug, Sep
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISCatalogRequestScheduler,
			{ pattern: '0 1 * 1-2,8-9 *' },
			buildCatalogSchedulerJob(upcomingPeriod)
		)

		// Daily at 2 AM in Jan, Feb, Aug, Sep
		await scraper.queue.request.upsertJobScheduler(
			ScraperInSISStudyPlansRequestScheduler,
			{ pattern: '0 2 * 1-2,8-9 *' },
			buildStudyPlansSchedulerJob(periodsForLastFourYears)
		)

		console.log('BullMQ schedulers have been configured.')
	}
}

export { scraper }
