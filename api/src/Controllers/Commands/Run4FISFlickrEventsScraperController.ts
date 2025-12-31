import { scraper } from '@api/bullmq'
import { Request, Response } from 'express'

export default async function Run4FISFlickrEventsScraperController(req: Request, res: Response) {
    await scraper.queue.request.add(
        '4FIS Flickr Events Request (Manual)',
        {
            type: '4FIS:Flickr:Events',
            auto_queue_events: true
        },
        {
            deduplication: {
                id: '4FIS:Flickr:Events:ManualRun'
            }
        }
    )

    return res.sendStatus(200)
}
