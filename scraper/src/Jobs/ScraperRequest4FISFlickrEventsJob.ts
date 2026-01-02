import scraper from '@scraper/bullmq'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import { Scraper4FISFlickrEventsRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import Extract4FISFlickrService from '@scraper/Services/Extractors/Extract4FISFlickrService'
import LoggerService from '@scraper/Services/LoggerService'
import puppeteer, { Page } from 'puppeteer'

// Configuration Constants
const FLICKR_BASE_URL = 'https://www.flickr.com/photos/4fis/albums'
const BLACKLISTED_ALBUM_ID = '72157720191510905'
const VIEWPORT_OPTS = { width: 1280, height: 800 }
const SCROLL_OPTS = { maxAttempts: 50, delay: 1500 }
const COOKIE_WAIT_DELAY = 2000

/**
 * Job processor for scraping FIS Flickr event albums.
 * Handles pagination, infinite scrolling, cookie consent frames, and queuing of individual album jobs.
 *
 * @param data - The job data containing configuration for the scraper.
 * @returns A promise resolving to the list of discovered event IDs.
 */
export default async function ScraperRequest4FISFlickrEventsJob(data: Scraper4FISFlickrEventsRequestJob): Promise<Scraper4FISEvents> {
    const logger = new LoggerService(`[${data.type}]`)
    logger.log('Started - Launching Puppeteer...')

    const events: Scraper4FISEvents = { ids: [] }
    const uniqueIds = new Set<string>()

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
        const page = await browser.newPage()
        await page.setViewport(VIEWPORT_OPTS)

        let pageNum = 1
        let hasMorePages = true

        while (hasMorePages) {
            logger.log(`Processing Page ${pageNum}...`)
            const url = pageNum === 1 ? FLICKR_BASE_URL : `${FLICKR_BASE_URL}/page${pageNum}`

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

            // Detect redirect to home, indicating end of pagination
            const currentUrl = page.url()
            if (pageNum > 1 && (currentUrl === FLICKR_BASE_URL || currentUrl === FLICKR_BASE_URL + '/')) {
                logger.log('Redirected to home (End of pagination).')
                hasMorePages = false
                break
            }

            await handleCookieConsent(page, logger)
            await performInfiniteScroll(page, logger, pageNum)

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

    // Filter out specific blacklisted album ID
    events.ids = [...uniqueIds].filter(id => id !== BLACKLISTED_ALBUM_ID)

    logger.log(`Scraping Complete - Total Unique IDs: ${events.ids.length}. Queuing response...`)
    await scraper.queue.response.add('4FIS Flickr Events Response', { type: '4FIS:Flickr:Events', events })

    if (!events.ids || events.ids.length === 0 || !data.auto_queue_events) {
        logger.log('Finished (No individual jobs queued).')
        return events
    }

    logger.log(`Auto-Queueing ${events.ids.length} individual album jobs...`)
    await scraper.queue.request.addBulk(
        events.ids.map(eventId => ({
            name: '4FIS Flickr Event Request',
            data: {
                type: '4FIS:Flickr:Event',
                eventId
            },
            opts: {
                deduplication: {
                    id: `4FIS:Flickr:Event:${eventId}`
                }
            }
        }))
    )

    return events
}

/**
 * Handles the TrustArc cookie consent iframe if it appears.
 * Searches for known "Accept" button variations and clicks them.
 * * @param page - The Puppeteer page instance.
 * @param page - The Puppeteer page instance.
 * @param logger - The logger instance.
 */
async function handleCookieConsent(page: Page, logger: LoggerService): Promise<void> {
    try {
        const iframeSelector = 'iframe.truste_popframe'
        const elementHandle = await page.$(iframeSelector)

        if (elementHandle) {
            logger.log('Handling Cookie Consent...')
            const frame = await elementHandle.contentFrame()

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
                await new Promise(r => setTimeout(r, COOKIE_WAIT_DELAY))
            }
        }
    } catch {
        // Fail silently on cookie errors to avoid interrupting the main scrape
    }
}

/**
 * Performs an infinite scroll on the page to trigger lazy loading of albums.
 * Scrolls to the bottom repeatedly until the page height stops increasing.
 * * @param page - The Puppeteer page instance.
 * @param page - The Puppeteer page instance.
 * @param logger - The logger instance.
 * @param pageNum - The current page number (for logging).
 */
async function performInfiniteScroll(page: Page, logger: LoggerService, pageNum: number): Promise<void> {
    logger.log(`Scrolling page ${pageNum}...`)

    let previousHeight = 0
    let scrollAttempts = 0

    while (scrollAttempts < SCROLL_OPTS.maxAttempts) {
        previousHeight = await page.evaluate(() => document.body.scrollHeight)
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

        await new Promise(r => setTimeout(r, SCROLL_OPTS.delay))

        const newHeight = await page.evaluate(() => document.body.scrollHeight)

        if (newHeight === previousHeight) {
            // Double check to verify truly at bottom
            await new Promise(r => setTimeout(r, SCROLL_OPTS.delay))
            const doubleCheckHeight = await page.evaluate(() => document.body.scrollHeight)
            if (doubleCheckHeight === previousHeight) break
        }

        scrollAttempts++
    }
}
