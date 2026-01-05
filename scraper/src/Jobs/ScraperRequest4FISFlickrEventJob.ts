import scraper from '@scraper/bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import { Scraper4FISFlickrEventRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISFlickrService from '@scraper/Services/Extractors/Extract4FISFlickrService'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import Axios from 'axios'

export default async function ScraperRequest4FISFlickrEventJob(data: Scraper4FISFlickrEventRequestJob): Promise<Scraper4FISEvent | null> {
    const url = `https://www.flickr.com/photos/4fis/albums/${data.eventId}`

    try {
        const response = await Axios.get<string>(url, {
            headers: Extract4FISService.baseRequestHeaders()
        })

        const event = Extract4FISFlickrService.extractEvent(response.data, data.eventId)

        LoggerJobContext.add({
            event_id: event?.id,
            event_title: event?.title,
            event_date: event?.datetime
        })

        await scraper.queue.response.add('4FIS Event Response', { type: '4FIS:Event', event })

        return event
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
                LoggerJobContext.add({
                    event_status: 'not_found'
                })

                return null
            }

            LoggerJobContext.add({
                event_status: 'error',
                event_error_status: error.response?.status,
                event_error_status_text: error.response?.statusText
            })
        } else {
            LoggerJobContext.add({
                event_status: 'error',
                event_error_message: (error as Error).message
            })
        }

        return null
    }
}
