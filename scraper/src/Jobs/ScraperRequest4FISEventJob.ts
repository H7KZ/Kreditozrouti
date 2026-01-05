import scraper from '@scraper/bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import { Scraper4FISEventRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import Axios from 'axios'

export default async function ScraperRequest4FISEventJob(data: Scraper4FISEventRequestJob): Promise<Scraper4FISEvent | null> {
    const url = `https://4fis.cz/${data.eventId}`

    LoggerJobContext.add({
        event_id: data.eventId,
        request_url: url
    })

    try {
        const response = await Axios.get<string>(url, {
            headers: Extract4FISService.baseRequestHeaders()
        })

        const event = Extract4FISService.extractEvent(response.data)

        if (!event) {
            LoggerJobContext.add({
                error: 'Failed to extract event data'
            })
            return null
        }

        LoggerJobContext.add({
            event_title: event.title,
            event_datetime: event.datetime,
            event_place: event.place
        })

        await scraper.queue.response.add('4FIS Event Response', { type: '4FIS:Event', event })

        return event
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
                LoggerJobContext.add({
                    error: 'Event not found (404)'
                })
                return null
            }

            LoggerJobContext.add({
                error: `HTTP Error: ${error.response?.status} - ${error.message}`
            })
        } else {
            LoggerJobContext.add({
                error: `Unexpected Error: ${error}`
            })
        }

        return null
    }
}
