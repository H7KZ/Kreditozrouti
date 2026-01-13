import { scraper } from '@api/bullmq'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'

/**
 * Manually triggers the scraper for InSIS Study Plan.
 *
 * @route POST /commands/insis/studyplan
 */
export default async function RunInSISStudyPlanScraperController(req: Request, res: Response) {
	const url: string = (req.body as { url?: string }).url ?? ''

	if (!url) throw new Exception(400)

	await scraper.queue.request.add(
		'InSIS Study Plan Request (Manual)',
		{
			type: 'InSIS:StudyPlan',
			url: url
		},
		{
			deduplication: {
				id: 'InSIS:StudyPlan:ManualRun',
				ttl: 1000 // 1 second
			}
		}
	)

	return res.sendStatus(200)
}
