import type { ScraperInSISGapSweepResponseJob } from '@shared/queue/jobs'
import { scraper } from '@api/bullmq'
import { logger } from '@api/logger'
import InSISService from '@api/Services/InSISService'
import ScraperGapSweeperService from '@api/Services/ScraperGapSweeperService'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function ScraperResponseInSISGapSweepJob(_data: ScraperInSISGapSweepResponseJob): Promise<void> {
	const missingIdents = await ScraperGapSweeperService.getMissingIdents()

	if (missingIdents.length === 0) {
		logger.info('bullmq.gap_sweep_no_missing')
		return
	}

	const upcomingPeriod = InSISService.getUpcomingPeriod()

	await scraper.queue.request.add(
		'InSIS Catalog Request (Gap Sweep)',
		{
			type: 'InSIS:Catalog',
			faculties: undefined,
			periods: [upcomingPeriod],
			allowed_idents: missingIdents,
			auto_queue_courses: true
		},
		{
			deduplication: {
				id: 'InSIS:Catalog:GapSweep',
				ttl: 60 * 60 * 1000
			}
		}
	)

	logger.info({ missing_count: missingIdents.length }, 'bullmq.gap_sweep_triggered')
}
