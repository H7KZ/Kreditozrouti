import scraper from '@scraper/bullmq'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import { Scraper4FISEventsRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISService from '@scraper/Services/Extractors/Extract4FISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

interface RequestEvents {
    data: string
    max_num_pages: number
}

export default async function ScraperRequest4FISEventsJob(data: Scraper4FISEventsRequestJob): Promise<Scraper4FISEvents | null> {
    const logger = new LoggerService(`[4FIS:EventsList]`)
    const events: Scraper4FISEvents = { ids: [] }
    let max_num_pages = 1

    logger.log('Started - Initializing pagination...')

    try {
        for (let page = 1; page <= max_num_pages; page++) {
            logger.log(`Processing Page ${page}/${max_num_pages}...`)

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
                    logger.warn(`Page ${page} returned no data payload.`)
                    continue
                }

                const newEvents = Extract4FISService.extractEventArticles(response.data.data)
                events.ids.push(...newEvents.ids)
            } catch (error) {
                // If a single page fails, we log and try to continue, unless it's the first page
                logger.error(`Failed to fetch/parse Page ${page}`, error)
                if (page === 1) throw error
            }
        }

        logger.log(`Pagination Complete - Found ${events.ids.length} total events. Queuing response...`)
        await scraper.queue.response.add('4FIS Events Response', { type: '4FIS:Events', events })

        if (!events.ids.length || !data.auto_queue_events) {
            logger.log('Finished (No individual jobs queued).')
            return events
        }

        logger.log(`Auto-Queueing ${events.ids.length} event jobs...`)
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

        logger.log('Finished successfully.')
        return events
    } catch (error) {
        logger.error(`Critical Failure: ${(error as Error).message}`)
        return null
    }
}
