import { scraper } from '@scraper/bullmq'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import { Scraper4FISFlickrEventsRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISFlickrService from '@scraper/Services/Extractors/Extract4FISFlickrService'
import LoggerService from '@scraper/Services/LoggerService'
import puppeteer from 'puppeteer'

export default async function ScraperRequest4FISFlickrEventsJob(data: Scraper4FISFlickrEventsRequestJob): Promise<Scraper4FISEvents> {
    const logger = new LoggerService(`[${data.type}]`)

    logger.log('Started - Launching Puppeteer...')
    const baseUrl = 'https://www.flickr.com/photos/4fis/albums'
    const events: Scraper4FISEvents = { ids: [] }
    const uniqueIds = new Set<string>()

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })

    try {
        const page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 800 })

        let pageNum = 1
        let hasMorePages = true

        while (hasMorePages) {
            logger.log(`Processing Page ${pageNum}...`)
            const url = pageNum === 1 ? baseUrl : `${baseUrl}/page${pageNum}`

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

            const currentUrl = page.url()

            if (pageNum > 1 && (currentUrl === baseUrl || currentUrl === baseUrl + '/')) {
                logger.log('Redirected to home (End of pagination).')
                hasMorePages = false
                break
            }

            // Cookie Consent Logic (Condensed for logging clarity)
            try {
                const iframeSelector = 'iframe.truste_popframe'
                if ((await page.$(iframeSelector)) !== null) {
                    logger.log('Handling Cookie Consent...')
                    // ... existing cookie logic ...
                    const elementHandle = await page.$(iframeSelector)
                    const frame = await elementHandle?.contentFrame()
                    if (frame) {
                        await frame.evaluate(() => {
                            const buttons = Array.from(document.querySelectorAll('a, button'))
                            const acceptBtn = buttons.find(
                                b =>
                                    b.textContent?.includes('Submit Preferences') ||
                                    b.textContent?.includes('Accept') ||
                                    b.textContent?.includes('Save and Exit') ||
                                    b.textContent?.includes('Souhlas')
                            ) as HTMLElement | undefined
                            if (acceptBtn) acceptBtn.click()
                        })
                        await new Promise(r => setTimeout(r, 2000))
                    }
                }
            } catch {
                /* Ignore */
            }

            logger.log(`Scrolling page ${pageNum}...`)
            let previousHeight = 0
            let scrollAttempts = 0
            const maxAttempts = 50

            while (scrollAttempts < maxAttempts) {
                previousHeight = await page.evaluate(() => document.body.scrollHeight)
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
                await new Promise(r => setTimeout(r, 1500))
                const newHeight = await page.evaluate(() => document.body.scrollHeight)

                if (newHeight === previousHeight) {
                    await new Promise(r => setTimeout(r, 1500))
                    const doubleCheckHeight = await page.evaluate(() => document.body.scrollHeight)
                    if (doubleCheckHeight === previousHeight) break
                }

                scrollAttempts++
            }

            const content = await page.content()
            const extracted = Extract4FISFlickrService.extractAlbumLinks(content)
            logger.log(`Page ${pageNum} done - Found ${extracted.ids.length} albums.`)

            if (extracted.ids.length === 0) {
                hasMorePages = false
            } else {
                extracted.ids.forEach(id => uniqueIds.add(id))
                pageNum++
            }
        }
    } catch (error) {
        logger.error(`Puppeteer Error:`, error)
    } finally {
        await browser.close()
    }

    events.ids = [...uniqueIds].filter(id => id !== '72157720191510905')

    logger.log(`Scraping Complete - Total Unique IDs: ${events.ids.length}. Queuing response...`)
    await scraper.queue.response.add('4FIS Flickr Events Response', { type: '4FIS:Flickr:Events', events })

    if (!events.ids || events.ids.length === 0 || !data.auto_queue_events) {
        logger.log('Finished (No individual jobs queued).')
        return events
    }

    logger.log('Auto-Queueing ${events.ids.length} individual album jobs...')
    events.ids.map(eventId => scraper.queue.request.add('4FIS Flickr Event Request', { type: '4FIS:Flickr:Event', eventId }))

    return events
}
