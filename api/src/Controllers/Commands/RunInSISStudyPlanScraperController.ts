import { Errors } from '@api/Errors'
import ScraperService from '@api/Services/ScraperService'
import { Request, Response } from 'express'
import * as z from 'zod'

const BodySchema = z.object({
	url: z.string()
})

/**
 * Manually triggers the scraper for InSIS Study Plan.
 *
 * @route POST /commands/insis/studyplan
 */
export default async function RunInSISStudyPlanScraperController(req: Request, res: Response) {
	const result = BodySchema.safeParse(req.body)

	if (!result.success) throw Errors.validation(result.error.issues)

	await ScraperService.enqueueStudyPlanScrape(result.data.url)

	return res.sendStatus(202)
}
