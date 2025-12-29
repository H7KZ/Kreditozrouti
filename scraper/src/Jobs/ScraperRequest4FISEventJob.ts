import { scraper } from '@scraper/bullmq'
import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import { Scraper4FISEventRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequest4FISEventJob(data: Scraper4FISEventRequestJob): Promise<Scraper4FISEvent | null> {
    const logger = new LoggerService(`[${data.type}] [${data.eventId}]`)

    logger.log('Started - Fetching HTML...')
    const response = await Axios.get<string>(`https://4fis.cz/${data.eventId}`, {
        headers: Extract4FISService.baseRequestHeaders()
    })

    logger.log('HTML Fetched - Extracting data...')
    const event = Extract4FISService.extractEvent(response.data)

    logger.log('Extraction Complete - Queuing response...')
    await scraper.queue.response.add('4FIS Event Response', { type: '4FIS:Event', event })

    logger.log('Finished successfully.')
    return event
}
