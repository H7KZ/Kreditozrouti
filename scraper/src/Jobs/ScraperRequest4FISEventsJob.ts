import { scraper } from '@scraper/bullmq'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import { Scraper4FISEventsRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import Axios from 'axios'

/**
 * Structure of the AJAX response from the 4fis.cz pagination endpoint.
 */
interface RequestEvents {
    /** HTML content containing event articles. */
    data: string
    /** Total number of available pagination pages. */
    max_num_pages: number
}

/**
 * Scrapes the complete list of FIS events by iterating through pagination.
 * Queues individual scrape jobs for every event ID found.
 *
 * @returns A promise that resolves when all pages are processed and jobs are queued.
 */
export default async function ScraperRequest4FISEventsJob(data: Scraper4FISEventsRequestJob): Promise<void> {
    const events: Scraper4FISEvents = { ids: [] }

    let max_num_pages = 1

    for (let page = 1; page <= max_num_pages; page++) {
        const request = await Axios.get<RequestEvents>(`https://4fis.cz/wp-admin/admin-ajax.php?action=example_ajax_request&paged=${page}&nonce=f6e3b07fed`, {
            headers: {
                'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
            }
        })

        if (request.data.max_num_pages) {
            max_num_pages = request.data.max_num_pages
        }

        if (!request.data.data) continue

        const newEvents = Extract4FISService.extractEventArticles(request.data.data)

        events.ids.push(...newEvents.ids)
    }

    await scraper.queue.response.add('4FIS Events Response', { type: '4FIS:Events', events })

    if (!events.ids || events.ids.length === 0 || !data.auto_queue_events) {
        return
    }

    events.ids.map(eventId => scraper.queue.request.add('4FIS Event Request (Events)', { type: '4FIS:Event', eventId }))
}
