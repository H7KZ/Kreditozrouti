import ScraperJob from '@scraper/Types/ScraperJob'

/**
 * Base configuration shared by all scraper request jobs.
 */
interface ScraperRequestJobBase {
    /** The specific type identifier for the scraping task. */
    type: ScraperJob
    /** Optional error details if the job failed during queuing. */
    error?: {
        message: string
    }
}

/**
 * Payload for requesting a crawl of the main 4FIS events list.
 */
export interface Scraper4FISEventsRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Events'
    auto_queue_events?: boolean
}

/**
 * Payload for requesting a crawl of a specific FIS event.
 */
export interface Scraper4FISEventRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Event'
    /** The unique identifier of the target event. */
    eventId: string
}

/**
 * Payload for requesting a crawl of the InSIS course catalog.
 */
export interface ScraperInSISCatalogRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Catalog'
    auto_queue_courses?: boolean
}

/**
 * Payload for requesting a crawl of a specific InSIS course.
 */
export interface ScraperInSISCourseRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Course'
    /** The full URL of the course page to scrape. */
    url: string
}

/**
 * Union type representing any valid scraper request job payload.
 */
type ScraperRequestJob = Scraper4FISEventsRequestJob | Scraper4FISEventRequestJob | ScraperInSISCatalogRequestJob | ScraperInSISCourseRequestJob

export default ScraperRequestJob
