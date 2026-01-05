import { scraper } from '@api/bullmq'
import { Request, Response } from 'express'

/**
 * Manually triggers the scraper for current 4FIS events.
 *
 * This controller enqueues a job to scrape the main list of events
 * from the 4FIS source and automatically queues discovered events for processing.
 *
 * @route POST /commands/4fis/events
 */
export default async function Run4FISEventsScraperController(req: Request, res: Response) {
    await scraper.queue.request.add(
        '4FIS Events Request (Manual)',
        {
            type: '4FIS:Events',
            auto_queue_events: true
        },
        {
            deduplication: {
                id: '4FIS:Events:ManualRun',
                ttl: 30 * 1000 // 30 seconds
            }
        }
    )

    return res.sendStatus(200)
}
