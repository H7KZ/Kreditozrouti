import { scraper } from '@api/bullmq'
import { Request, Response } from 'express'

/**
 * Manually triggers the scraper for a specific 4FIS Flickr event album.
 *
 * @route POST /commands/4fis/flickr/event
 */
export default async function Run4FISFlickrEventScraperController(req: Request, res: Response) {
    const { eventId } = req.body as { eventId?: string }

    if (!eventId) {
        return res.status(400).json({ message: 'eventId is required' })
    }

    await scraper.queue.request.add(
        '4FIS Flickr Event Request (Manual)',
        {
            type: '4FIS:Flickr:Event',
            eventId
        },
        {
            deduplication: {
                id: '4FIS:Flickr:Event:ManualRun'
            }
        }
    )

    return res.sendStatus(200)
}
