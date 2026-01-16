import { scraper } from '@api/bullmq'
import InSISSemester from '@scraper/Types/InSISSemester'
import { Request, Response } from 'express'

/**
 * Manually triggers the scraper for the InSIS Course Catalog.
 *
 * This controller enqueues a job to crawl the InSIS catalog structure.
 * It is configured to automatically queue discovered courses for further processing.
 *
 * @route POST /commands/insis/catalog
 */
export default async function RunInSISCatalogScraperController(req: Request, res: Response) {
	interface Body {
		faculties?: string[]

		periods?: {
			semester: InSISSemester | null
			year: number
		}[]
	}

	const body: Body = req.body as Body

	await scraper.queue.request.add(
		'InSIS Catalog Request (Manual)',
		{
			type: 'InSIS:Catalog',
			faculties: body.faculties,
			periods: body.periods,
			auto_queue_courses: true
		},
		{
			deduplication: {
				id: 'InSIS:Catalog:ManualRun',
				ttl: 30 * 1000 // 30 seconds
			}
		}
	)

	return res.sendStatus(200)
}
