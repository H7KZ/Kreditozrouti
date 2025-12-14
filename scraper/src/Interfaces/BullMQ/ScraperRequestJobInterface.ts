import ScraperJobType from '@scraper/Types/ScraperJobType'

/**
 * Base configuration shared by all scraper request jobs.
 */
interface ScraperRequestJobBase {
    /** The specific type identifier for the scraping task. */
    type: ScraperJobType
    /** Optional error details if the job failed during queuing. */
    error?: {
        message: string
    }
}

/**
 * Payload for requesting a crawl of the main FIS events list.
 */
export interface ScraperFISEventsRequestJobInterface extends ScraperRequestJobBase {
    type: '4FIS:Events'
}

/**
 * Payload for requesting a crawl of a specific FIS event.
 */
export interface ScraperFISEventRequestJobInterface extends ScraperRequestJobBase {
    type: '4FIS:Event'
    /** The unique identifier of the target event. */
    eventId: string
}

/**
 * Payload for requesting a crawl of the InSIS course catalog.
 */
export interface ScraperInSISCatalogRequestJobInterface extends ScraperRequestJobBase {
    type: 'InSIS:Catalog'
}

/**
 * Payload for requesting a crawl of a specific InSIS course.
 */
export interface ScraperInSISCourseRequestJobInterface extends ScraperRequestJobBase {
    type: 'InSIS:Course'
    /** The full URL of the course page to scrape. */
    url: string
}

/**
 * Union type representing any valid scraper request job payload.
 */
type ScraperRequestJobInterface =
    | ScraperFISEventsRequestJobInterface
    | ScraperFISEventRequestJobInterface
    | ScraperInSISCatalogRequestJobInterface
    | ScraperInSISCourseRequestJobInterface

export default ScraperRequestJobInterface
