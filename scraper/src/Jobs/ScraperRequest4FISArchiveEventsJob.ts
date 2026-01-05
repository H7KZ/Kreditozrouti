import scraper from '@scraper/bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import { Scraper4FISArchiveEventsRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Axios from 'axios'

export default async function ScraperRequest4FISArchiveEventsJob(data: Scraper4FISArchiveEventsRequestJob): Promise<Scraper4FISEvents | null> {
    const events: Scraper4FISEvents = { ids: [] }

    const cdxUrl = 'http://web.archive.org/cdx/search/cdx'
    const params = new URLSearchParams()
    params.append('url', '4fis.cz/*')
    params.append('output', 'json')
    params.append('collapse', 'urlkey')
    params.append('filter', 'statuscode:200')
    params.append('filter', 'mimetype:text/html')
    params.append('fl', 'original')

    try {
        LoggerJobContext.add({
            cdx_url: cdxUrl
        })

        const response = await Axios.get<string[][]>(cdxUrl, { params })
        const rows = response.data

        if (!rows || rows.length <= 1) {
            LoggerJobContext.add({
                found_urls: 0
            })

            return events
        }

        LoggerJobContext.add({
            found_urls: rows.length - 1
        })

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
            LoggerJobContext.add({
                found_categories: 0
            })
            return events
        }

        const categoryList = Array.from(foundCategories)

        LoggerJobContext.add({
            found_categories: categoryList.length,
            categories: categoryList
        })

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

        LoggerJobContext.add({
            found_event_ids: events.ids.length
        })

        await scraper.queue.response.add('4FIS Archive Events Response', { type: '4FIS:Events', events })

        if (!events.ids.length || !data.auto_queue_events) {
            LoggerJobContext.add({
                auto_queued_events: 0
            })

            return events
        }

        LoggerJobContext.add({
            auto_queued_events: events.ids.length
        })

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

        LoggerJobContext.add({
            auto_queue_complete: true
        })

        return events
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            LoggerJobContext.add({
                axios_error: true,
                axios_status: error.response?.status ?? null,
                axios_status_text: error.response?.statusText ?? null,
                axios_url: error.config?.url ?? null
            })
        } else {
            LoggerJobContext.add({
                axios_error: false,
                error_message: (error as Error).message
            })
        }

        return null
    }
}
