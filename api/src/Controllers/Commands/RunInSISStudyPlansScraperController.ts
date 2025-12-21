import { scraper } from '@api/bullmq'
import { Request, Response } from 'express'

export default async function RunInSISStudyPlansScraperController(req: Request, res: Response) {
    await scraper.queue.request.add(
        'InSIS Study Plans Request (Manual)',
        {
            type: 'InSIS:StudyPlans',
            auto_queue_study_plans: true
        },
        {
            deduplication: {
                id: 'InSIS:StudyPlans:ManualRun'
            }
        }
    )

    return res.sendStatus(200)
}
