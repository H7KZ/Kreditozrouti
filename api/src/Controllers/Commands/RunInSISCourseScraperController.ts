import { scraper } from '@api/bullmq'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'

/**
 * Manually triggers the scraper for a specific InSIS Course.
 *
 * @route POST /commands/insis/course
 */
export default async function RunInSISCourseScraperController(req: Request, res: Response) {
	interface Body {
		url?: string
	}

	const body: Body = req.body as Body

	if (!body.url) throw new Exception(400)

	await scraper.queue.request.add(
		'InSIS Course Request (Manual)',
		{
			type: 'InSIS:Course',
			url: body.url
		},
		{
			deduplication: {
				id: 'InSIS:Course:ManualRun',
				ttl: 1000 // 1 second
			}
		}
	)

	return res.sendStatus(200)
}
