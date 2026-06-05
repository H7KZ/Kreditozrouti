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
		.optional()
})

/**
 * Manually triggers the scraper for the InSIS Course Catalog.
 *
 * This controller enqueues a job to crawl the InSIS catalog structure.
 * It is configured to automatically queue discovered courses for further processing.
 *
 * @route POST /commands/insis/catalog
 */
export default async function RunInSISCatalogScraperController(req: Request, res: Response) {
	const body = BodySchema.safeParse(req.body)

	await ScraperService.enqueueCatalogScrape(body.success ? body.data : undefined)

	return res.sendStatus(202)
}
