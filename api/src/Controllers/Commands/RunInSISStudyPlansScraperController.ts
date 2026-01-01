import { scraper } from '@api/bullmq'
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
    await scraper.queue.request.add(
        'InSIS Study Plans Request (Manual)',
        {
            type: 'InSIS:StudyPlans',
            auto_queue_study_plans: true,
            auto_queue_courses: true
        },
        {
            deduplication: {
                id: 'InSIS:StudyPlans:ManualRun'
            }
        }
    )

    return res.sendStatus(200)
}
