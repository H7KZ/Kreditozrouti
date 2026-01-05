import { scraper } from '@api/bullmq'
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
    await scraper.queue.request.add(
        'InSIS Catalog Request (Manual)',
        {
            type: 'InSIS:Catalog',
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
