import { scraper } from '@scraper/bullmq'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import { Scraper4FISEventsRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

interface RequestEvents {
    data: string
    max_num_pages: number
}

export default async function ScraperRequest4FISEventsJob(data: Scraper4FISEventsRequestJob): Promise<Scraper4FISEvents> {
    const logger = new LoggerService(`[${data.type}]`)

    logger.log('Started - Initializing pagination...')
    const events: Scraper4FISEvents = { ids: [] }
    let max_num_pages = 1

    for (let page = 1; page <= max_num_pages; page++) {
        logger.log(`Processing Page ${page}/${max_num_pages}...`)

        const response = await Axios.get<RequestEvents>(`https://4fis.cz/wp-admin/admin-ajax.php?action=example_ajax_request&paged=${page}&nonce=f6e3b07fed`, {
            headers: Extract4FISService.baseRequestHeaders()
        })

        if (response.data.max_num_pages) {
            max_num_pages = response.data.max_num_pages
        }

        if (!response.data.data) {
            logger.log(`Warning - No data found on page ${page}.`)
            continue
        }

        const newEvents = Extract4FISService.extractEventArticles(response.data.data)
        events.ids.push(...newEvents.ids)
    }

    logger.log(`Pagination Complete - Found ${events.ids.length} total events. Queuing response...`)
    await scraper.queue.response.add('4FIS Events Response', { type: '4FIS:Events', events })

    if (!events.ids || events.ids.length === 0 || !data.auto_queue_events) {
        logger.log('Finished (No individual jobs queued).')
        return events
    }

    logger.log('Auto-Queueing ${events.ids.length} individual event jobs...')
    events.ids.map(eventId => scraper.queue.request.add('4FIS Event Request (Events)', { type: '4FIS:Event', eventId }))

    logger.log('Finished successfully.')
    return events
}
