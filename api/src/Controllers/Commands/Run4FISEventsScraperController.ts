import { scraper } from '@api/bullmq'
import { Request, Response } from 'express'

export default async function Run4FISEventsScraperController(req: Request, res: Response) {
    await scraper.queue.request.add('4FIS Events Request (Manual)', { type: '4FIS:Events', auto_queue_events: true })

    return res.sendStatus(200)
}
