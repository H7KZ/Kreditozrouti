import ScraperService from '@api/Services/ScraperService'
import InSISSemester from '@scraper/Types/InSISSemester'
import { Request, Response } from 'express'
import * as z from 'zod'

const BodySchema = z.object({
	faculties: z.array(z.string()).optional(),
	periods: z
		.array(
			z.object({
				semester: z.enum(['ZS', 'LS'] as [InSISSemester, ...InSISSemester[]]).nullable(),
				year: z.coerce.number()
			})
		)
		.optional()
})

/**
 * Manually triggers the scraper for InSIS Study Plans.
 *
 * This controller enqueues a job to scrape study plans. It is configured
 * to automatically queue both child study plans and associated courses.
 *
 * @route POST /commands/insis/studyplans
 */
export default async function RunInSISStudyPlansScraperController(req: Request, res: Response) {
	const result = BodySchema.safeParse(req.body)
	const body = result.success ? result.data : {}

	await ScraperService.enqueueStudyPlansScrape(body)

	return res.sendStatus(202)
}
