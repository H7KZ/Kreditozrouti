import { Errors } from '@api/Errors'
import ScraperService from '@api/Services/ScraperService'
import { Request, Response } from 'express'
import * as z from 'zod'

const BodySchema = z.object({
	url: z.string()
})

/**
 * Manually triggers the scraper for a specific InSIS Course.
 *
 * @route POST /commands/insis/course
 */
export default async function RunInSISCourseScraperController(req: Request, res: Response) {
	const result = BodySchema.safeParse(req.body)

	if (!result.success) throw Errors.validation(result.error.issues)

	await ScraperService.enqueueCourseScrape(result.data.url)

	return res.sendStatus(202)
}
