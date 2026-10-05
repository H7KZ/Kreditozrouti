import { Request, Response } from 'express'
import ScraperService from '@api/Services/ScraperService'

/**
 * Manually triggers the sweeper for missing InSIS courses.
 *
 * This controller enqueues a job to sweep course identifiers and identify
 * any missing course records that need to be backfilled.
 *
 * @route POST /commands/insis/sweep
 */
export default async function RunInSISSweeperController(_req: Request, res: Response) {
	await ScraperService.sweepMissingCourses()

	return res.sendStatus(202)
}
