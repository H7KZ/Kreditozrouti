import type { InSISSemester } from '@shared/domain/insis'
import { Request, Response } from 'express'
import * as z from 'zod'
import ScraperService from '@api/Services/ScraperService'

const BodySchema = z.object({
	faculties: z.array(z.string()).optional(),
	periods: z
		.array(
			z.object({
				semester: z.enum(['ZS', 'LS'] as [InSISSemester, ...InSISSemester[]]).nullable(),
				year: z.coerce.number()
			})
		)
		.optional(),
	auto_queue_courses: z.boolean().optional()
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
	const body = BodySchema.safeParse(req.body)

	await ScraperService.enqueueStudyPlansScrape(body.success ? body.data : undefined)

	return res.sendStatus(202)
}
