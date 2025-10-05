import { JobEnum } from '@api/Enums/JobEnum'
import FISEventsInterface from '@api/Interfaces/FISEventsInterface'
import { scraper } from '@scraper/bullmq'
import FISEventsRequestInterface from '@scraper/Interfaces/FISEventsRequestInterface'
import ExtractService from '@scraper/Services/ExtractService'
import Axios from 'axios'

export default async function EventsController(): Promise<void> {
    const events: FISEventsInterface[] = []

    let max_num_pages = 1
    for (let page = 1; page <= max_num_pages; page++) {
        const request = await Axios.get<FISEventsRequestInterface>(`https://4fis.cz/wp-admin/admin-ajax.php?action=example_ajax_request&paged=${page}&nonce=f6e3b07fed`, {
            headers: {
                'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
            }
        })

        if (request.data.max_num_pages) {
            max_num_pages = request.data.max_num_pages
        }

        if (!request.data.data) continue

        const newEvents = ExtractService.extractAllArticlesWithParser(request.data.data)

        events.push(...newEvents)
    }

    await scraper.queue.response.add(JobEnum.EVENTS_RESPONSE, { type: 'Events', events })

    await Promise.all(events.map(ev => scraper.queue.request.add(JobEnum.EVENT_REQUEST, { type: 'Event', eventId: ev.eventId })))
}
