import { JobEnum } from '@api/Enums/JobEnum'
import { scraper } from '@scraper/bullmq'
import FISEventsInterface from '@scraper/Interfaces/FIS/FISEventsInterface'
import ExtractFISService from '@scraper/Services/ExtractFISService'
import Axios from 'axios'

/**
 * Structure of the AJAX response from the 4fis.cz pagination endpoint.
 */
interface RequestEventsInterface {
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
export default async function FISEventsController(): Promise<void> {
    const events: FISEventsInterface = { ids: [] }

    let max_num_pages = 1

    for (let page = 1; page <= max_num_pages; page++) {
        const request = await Axios.get<RequestEventsInterface>(
            `https://4fis.cz/wp-admin/admin-ajax.php?action=example_ajax_request&paged=${page}&nonce=f6e3b07fed`,
            {
                headers: {
                    'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
                }
            }
        )

        if (request.data.max_num_pages) {
            max_num_pages = request.data.max_num_pages
        }

        if (!request.data.data) continue

        const newEvents = ExtractFISService.extractAllFISEventArticlesWithParser(request.data.data)

        events.ids.push(...newEvents.ids)
    }

    await scraper.queue.response.add(JobEnum.FIS_EVENTS_RESPONSE, { type: '4FIS:Events', events })

    events.ids.map(eventId => scraper.queue.request.add(JobEnum.FIS_EVENT_REQUEST, { type: '4FIS:Event', eventId }))
}
