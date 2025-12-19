import { scraper } from '@api/bullmq'
import { Request, Response } from 'express'

export default async function RunInSISCatalogScraperController(req: Request, res: Response) {
    await scraper.queue.request.add('InSIS Catalog Request (Manual)', { type: 'InSIS:Catalog', auto_queue_courses: true })

    return res.sendStatus(200)
}
