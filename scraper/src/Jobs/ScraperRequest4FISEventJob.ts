import { scraper } from '@scraper/bullmq'
import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import { Scraper4FISEventRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequest4FISEventJob(data: Scraper4FISEventRequestJob): Promise<Scraper4FISEvent | null> {
    const logger = new LoggerService(`[4FIS:Event] [ID: ${data.eventId}]`)
    const url = `https://4fis.cz/${data.eventId}`

    logger.log('Started - Fetching HTML...')

    try {
        const response = await Axios.get<string>(url, {
            headers: Extract4FISService.baseRequestHeaders()
        })

        logger.log('HTML Fetched - Extracting metadata...')
        const event = Extract4FISService.extractEvent(response.data)

        if (!event) {
            logger.warn('Extraction returned null (Canonical URL or critical data missing).')
            return null
        }

        logger.log('Extraction Complete - Queuing response...')
        await scraper.queue.response.add('4FIS Event Response', { type: '4FIS:Event', event })

        logger.log('Finished successfully.')
        return event
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
                logger.warn(`Event not found (404). Skipping.`)
                return null
            }
            logger.error(`Network Error: ${error.message}`)
        } else {
            logger.error(`Parsing Error: ${(error as Error).message}`)
        }

        return null
    }
}
