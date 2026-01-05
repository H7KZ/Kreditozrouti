import scraper from '@scraper/bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import { Scraper4FISEventsRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import Axios from 'axios'

interface RequestEvents {
    data: string
    max_num_pages: number
}

export default async function ScraperRequest4FISEventsJob(data: Scraper4FISEventsRequestJob): Promise<Scraper4FISEvents | null> {
    const events: Scraper4FISEvents = { ids: [] }
    let max_num_pages = 1

    try {
        for (let page = 1; page <= max_num_pages; page++) {
            try {
                const response = await Axios.get<RequestEvents>(
                    `https://4fis.cz/wp-admin/admin-ajax.php?action=example_ajax_request&paged=${page}&nonce=f6e3b07fed`,
                    {
                        headers: Extract4FISService.baseRequestHeaders()
                    }
                )

                if (response.data.max_num_pages) {
                    max_num_pages = response.data.max_num_pages
                }

                if (!response.data.data) {
                    continue
                }

                const newEvents = Extract4FISService.extractEventArticles(response.data.data)
                events.ids.push(...newEvents.ids)
            } catch (error) {
                // If a single page fails, we log and try to continue, unless it's the first page
                if (page === 1) {
                    LoggerJobContext.add({
                        message: `Failed to fetch first page of events: ${(error as Error).message}`
                    })

                    throw error
                }
            }
        }

        LoggerJobContext.add({
            events_found: events.ids.length
        })

        await scraper.queue.response.add('4FIS Events Response', { type: '4FIS:Events', events })

        if (!events.ids.length || !data.auto_queue_events) {
            LoggerJobContext.add({
                auto_queue_events: false
            })

            return events
        }

        LoggerJobContext.add({
            auto_queue_events: true,
            events_queued: events.ids.length
        })

        await scraper.queue.request.addBulk(
            events.ids.map(eventId => ({
                name: '4FIS Event Request (Events)',
                data: {
                    type: '4FIS:Event',
                    eventId
                },
                opts: {
                    deduplication: {
                        id: `4FIS:Event:${eventId}`
                    }
                }
            }))
        )

        return events
    } catch (error) {
        LoggerJobContext.add({
            message: `Failed to scrape 4FIS events: ${(error as Error).message}`
        })

        return null
    }
}
