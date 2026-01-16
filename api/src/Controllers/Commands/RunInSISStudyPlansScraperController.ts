import { scraper } from '@api/bullmq'
import InSISSemester from '@scraper/Types/InSISSemester'
import { Request, Response } from 'express'

/**
 * Manually triggers the scraper for InSIS Study Plans.
 *
 * This controller enqueues a job to scrape study plans. It is configured
 * to automatically queue both child study plans and associated courses.
 *
 * @route POST /commands/insis/studyplans
 */
export default async function RunInSISStudyPlansScraperController(req: Request, res: Response) {
	interface Body {
		faculties?: string[]

		periods?: {
			semester: InSISSemester | null
			year: number
		}[]
	}

	const body: Body = req.body as Body

	await scraper.queue.request.add(
		'InSIS Study Plans Request (Manual)',
		{
			type: 'InSIS:StudyPlans',
			faculties: body.faculties,
			periods: body.periods,
			auto_queue_study_plans: true
		},
		{
			deduplication: {
				id: 'InSIS:StudyPlans:ManualRun',
				ttl: 30 * 1000 // 30 seconds
			}
		}
	)

	return res.sendStatus(200)
}
