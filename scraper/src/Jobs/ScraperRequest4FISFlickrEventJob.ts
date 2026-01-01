import scraper from '@scraper/bullmq'
import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import { Scraper4FISFlickrEventRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISFlickrService from '@scraper/Services/Extractors/Extract4FISFlickrService'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequest4FISFlickrEventJob(data: Scraper4FISFlickrEventRequestJob): Promise<Scraper4FISEvent | null> {
    const logger = new LoggerService(`[4FIS:Flickr:Event] [ID: ${data.eventId}]`)
    const url = `https://www.flickr.com/photos/4fis/albums/${data.eventId}`

    logger.log('Started - Fetching Flickr album...')

    try {
        const response = await Axios.get<string>(url, {
            headers: Extract4FISService.baseRequestHeaders()
        })

        logger.log('HTML Fetched - Extracting album data...')
        const event = Extract4FISFlickrService.extractEvent(response.data, data.eventId)

        logger.log('Extraction Complete - Queuing response...')
        await scraper.queue.response.add('4FIS Event Response', { type: '4FIS:Event', event })

        logger.log('Finished successfully.')
        return event
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
                logger.warn('Album not found (404).')
                return null
            }

            logger.error(`Network Error: ${error.message}`)
        } else {
            logger.error(`Parsing Error: ${(error as Error).message}`)
        }

        return null
    }
}
