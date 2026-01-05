import { scraper } from '@api/bullmq'
import { Request, Response } from 'express'

/**
 * Manually triggers the scraper for the 4FIS Flickr photostream/events list.
 *
 * This controller enqueues a job to discover new event albums on Flickr
 * and automatically queues them for detailed scraping.
 *
 * @route POST /commands/4fis/flickr/events
 */
export default async function Run4FISFlickrEventsScraperController(req: Request, res: Response) {
    await scraper.queue.request.add(
        '4FIS Flickr Events Request (Manual)',
        {
            type: '4FIS:Flickr:Events',
            auto_queue_events: true
        },
        {
            deduplication: {
                id: '4FIS:Flickr:Events:ManualRun',
                ttl: 30 * 1000 // 30 seconds
            }
        }
    )

    return res.sendStatus(200)
}
