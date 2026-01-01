import { scraper } from '@scraper/bullmq'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import { Scraper4FISArchiveEventsRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequest4FISArchiveEventsJob(data: Scraper4FISArchiveEventsRequestJob): Promise<Scraper4FISEvents | null> {
    const logger = new LoggerService(`[4FIS:Archive:Discovery]`)
    const events: Scraper4FISEvents = { ids: [] }

    logger.log('Started - Initializing Archive.org CDX query...')

    const cdxUrl = 'http://web.archive.org/cdx/search/cdx'
    const params = new URLSearchParams()
    params.append('url', '4fis.cz/*')
    params.append('output', 'json')
    params.append('collapse', 'urlkey')
    params.append('filter', 'statuscode:200')
    params.append('filter', 'mimetype:text/html')
    params.append('fl', 'original')

    try {
        logger.log(`Fetching CDX data from: ${cdxUrl}`)
        const response = await Axios.get<string[][]>(cdxUrl, { params })
        const rows = response.data

        if (!rows || rows.length <= 1) {
            logger.log('Finished - No historical data found.')
            return events
        }

        logger.log(`Fetched ${rows.length - 1} records. Analyzing URL structures...`)

        // 1. Discovery Pass
        const foundCategories = new Set<string>()
        const categoryPathRegex = /4fis\.cz\/category\/([^/]+)\/?/i
        const filterParamRegex = /[?&]filter=([^&]+)/i

        for (let i = 1; i < rows.length; i++) {
            const url = rows[i][0]
            const catMatch = categoryPathRegex.exec(url)
            if (catMatch?.[1]) foundCategories.add(catMatch[1])

            if (url.includes('/akce/')) {
                const filterMatch = filterParamRegex.exec(url)
                if (filterMatch?.[1]) foundCategories.add(filterMatch[1])
            }
        }

        if (foundCategories.size === 0) {
            logger.warn('No categories found. Cannot perform safe extraction.')
            return events
        }

        const categoryList = Array.from(foundCategories)
        logger.log(`Identified ${categoryList.length} categories. extracting event IDs...`)

        // 2. Extraction Pass
        const uniqueIds = new Set<string>()
        const escapedCategories = categoryList.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        const eventUrlRegex = new RegExp(`4fis\\.cz\\/(${escapedCategories.join('|')})\\/([^\\/?#]+)\\/?$`, 'i')
        const ignoredSlugs = ['feed', 'wp-admin', 'wp-login.php', 'xmlrpc.php', 'page']

        for (let i = 1; i < rows.length; i++) {
            const url = rows[i][0]
            const match = url.match(eventUrlRegex)

            if (match?.[1] && match?.[2]) {
                const category = match[1]
                const slug = match[2]

                if (!ignoredSlugs.includes(slug) && !slug.startsWith('page')) {
                    uniqueIds.add(`${category}/${slug}`)
                }
            }
        }

        events.ids = Array.from(uniqueIds)

        logger.log(`Extraction Complete - Found ${events.ids.length} unique events. Queuing response...`)
        await scraper.queue.response.add('4FIS Archive Events Response', { type: '4FIS:Events', events })

        if (!events.ids.length || !data.auto_queue_events) {
            logger.log('Finished (No individual jobs queued).')
            return events
        }

        logger.log(`Auto-Queueing ${events.ids.length} event jobs...`)
        await scraper.queue.request.addBulk(
            events.ids.map(eventId => ({
                name: '4FIS Event Request (Archive)',
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
        if (Axios.isAxiosError(error)) {
            logger.error(`Network Error querying Archive: ${error.message} (Status: ${error.response?.status})`)
        } else {
            logger.error(`Processing Error: ${(error as Error).message}`)
        }

        return null
    }
}
