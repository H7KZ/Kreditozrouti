import { scraper } from '@api/bullmq'
import { Request, Response } from 'express'

/**
 * Manually triggers the scraper for 4FIS archived events.
 *
 * This controller enqueues a job to scrape historical or archived events
 * from the 4FIS source. It enables auto-queuing of individual events found
 * during the scrape.
 *
 * @route POST /commands/4fis/archive/events
 */
export default async function Run4FISArchiveEventsScraperController(req: Request, res: Response) {
    await scraper.queue.request.add(
        '4FIS Archive Events Request (Manual)',
        {
            type: '4FIS:Archive:Events',
            auto_queue_events: true
        },
        {
            deduplication: {
                id: '4FIS:Archive:Events:ManualRun'
            }
        }
    )

    return res.sendStatus(200)
}
