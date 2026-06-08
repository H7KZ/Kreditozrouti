import { Request, Response } from 'express'
import ScraperService from '@api/Services/ScraperService'

/**
 * Manually triggers the scraper for InSIS Academic Schedules.
 *
 * @route POST /commands/insis/academic-schedules
 */
export default async function RunInSISAcademicSchedulesScraperController(_req: Request, res: Response) {
	await ScraperService.enqueueAcademicSchedulesScrape()

	return res.sendStatus(202)
}
