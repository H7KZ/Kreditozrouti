import ScraperService from '@api/Services/ScraperService'
import type { InSISSemester } from '@scraper/types/insis'
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
 * Manually triggers the scraper for the InSIS Course Catalog.
 *
 * This controller enqueues a job to crawl the InSIS catalog structure.
 * It is configured to automatically queue discovered courses for further processing.
 *
 * @route POST /commands/insis/catalog
 */
export default async function RunInSISCatalogScraperController(req: Request, res: Response) {
	const result = BodySchema.safeParse(req.body)
	const body = result.success ? result.data : {}

	await ScraperService.enqueueCatalogScrape(body)

	return res.sendStatus(202)
}
