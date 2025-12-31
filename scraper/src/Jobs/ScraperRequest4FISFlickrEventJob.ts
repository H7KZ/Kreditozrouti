import { scraper } from '@scraper/bullmq'
import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import { Scraper4FISFlickrEventRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISFlickrService from '@scraper/Services/Extractors/Extract4FISFlickrService'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequest4FISFlickrEventJob(data: Scraper4FISFlickrEventRequestJob): Promise<Scraper4FISEvent | null> {
    const logger = new LoggerService(`[${data.type}] [${data.eventId}]`)

    logger.log('Started - Fetching Flickr album...')
    const response = await Axios.get<string>(`https://www.flickr.com/photos/4fis/albums/${data.eventId}`, {
        headers: Extract4FISService.baseRequestHeaders()
    })

    logger.log('HTML Fetched - Extracting data...')
    const event = Extract4FISFlickrService.extractEvent(response.data, data.eventId)

    logger.log('Extraction Complete - Queuing response...')
    await scraper.queue.response.add('4FIS Flickr Event Response', { type: '4FIS:Flickr:Event', event })

    logger.log('Finished successfully.')
    return event
}
