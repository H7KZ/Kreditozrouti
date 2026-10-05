import { Request, Response } from 'express'
import * as z from 'zod'
import { Errors } from '@api/Errors'
import ScraperService from '@api/Services/ScraperService'

const BodySchema = z.object({
	types: z
		.array(z.enum(['InSIS:Course', 'InSIS:StudyPlan']))
		.min(1)
		.optional()
})

/**
 * Re-enqueues all currently-failed InSIS Course and/or Study Plan scrape jobs.
 * Eases recovery after a burst of failures (e.g. the staging faculty-upsert deadlocks).
 *
 * Body `types` defaults to both `InSIS:Course` and `InSIS:StudyPlan` when omitted.
 *
 * @route POST /commands/insis/retry-failed
 */
export default async function RetryFailedInSISScrapesController(req: Request, res: Response) {
	const result = BodySchema.safeParse(req.body)

	if (!result.success) throw Errors.validation(result.error.issues)

	const types = result.data.types ?? ['InSIS:Course', 'InSIS:StudyPlan']

	const counts = await ScraperService.retryFailedScrapes(types)

	return res.status(200).json({ retried: counts })
}
