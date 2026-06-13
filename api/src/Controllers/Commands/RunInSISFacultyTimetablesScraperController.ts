import { Request, Response } from 'express'
import ScraperService from '@api/Services/ScraperService'

export default async function RunInSISFacultyTimetablesScraperController(_req: Request, res: Response) {
	await ScraperService.enqueueFacultyTimetablesScrape()

	return res.sendStatus(202)
}
