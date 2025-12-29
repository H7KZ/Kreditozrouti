import ScraperResponse4FISEventJob from '@api/Jobs/ScraperResponse4FISEventJob'
import { Scraper4FISFlickrEventResponseJob } from '@scraper/Interfaces/ScraperResponseJob'

/**
 * Handles the response for a completed 4FIS Flickr event scraping job.
 *
 * @param data - The data payload containing the scraped event details.
 */
export default async function ScraperResponse4FISFlickrEventJob(data: Scraper4FISFlickrEventResponseJob): Promise<void> {
    await ScraperResponse4FISEventJob({ type: '4FIS:Event', event: data.event })
}
