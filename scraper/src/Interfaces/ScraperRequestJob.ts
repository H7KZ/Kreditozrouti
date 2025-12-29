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

    /** Whether to automatically queue individual event requests after fetching the events list. */
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
 * Payload for requesting a crawl of the main 4FIS Flickr events list.
 */
export interface Scraper4FISFlickrEventsRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Flickr:Events'

    /** Whether to automatically queue individual event requests after fetching the events list. */
    auto_queue_events?: boolean
}

/**
 * Payload for requesting a crawl of a specific 4FIS Flickr event.
 */
export interface Scraper4FISFlickrEventRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Flickr:Event'

    /** The unique identifier of the target event. */
    eventId: string
}

/**
 * Payload for requesting a crawl of the InSIS course catalog.
 */
export interface ScraperInSISCatalogRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Catalog'

    /** Whether to automatically queue individual course requests after fetching the catalog. */
    auto_queue_courses?: boolean
}

/**
 * Payload for requesting a crawl of a specific InSIS course.
 */
export interface ScraperInSISCourseRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Course'

    /** The full URL of the course page to scrape. */
    url: string

    /** Metadata about the catalog crawl context. */
    meta: {
        /** The faculty associated with the catalog crawl. */
        faculty: {
            id: number | null
            name: string | null
        }

        /** The academic period associated with the catalog crawl. */
        period: {
            id: number | null
            name: string | null
        }
    }
}

/**
 * Payload for requesting a crawl of the InSIS study plans list.
 */
export interface ScraperInSISStudyPlansRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:StudyPlans'

    /** Whether to automatically queue individual study plan requests after fetching the list. */
    auto_queue_study_plans?: boolean

    /** Whether to automatically queue individual course requests found within the study plans. */
    auto_queue_courses?: boolean
}

/**
 * Payload for requesting a crawl of a specific InSIS study plan.
 */
export interface ScraperInSISStudyPlanRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:StudyPlan'

    /** Whether to automatically queue individual course requests found within the study plan. */
    auto_queue_courses?: boolean

    /** The full URL of the study plan page to scrape. */
    url: string
}

/**
 * Union type representing any valid scraper request job payload.
 */
type ScraperRequestJob =
    | Scraper4FISEventsRequestJob
    | Scraper4FISEventRequestJob
    | Scraper4FISFlickrEventsRequestJob
    | Scraper4FISFlickrEventRequestJob
    | ScraperInSISCatalogRequestJob
    | ScraperInSISCourseRequestJob
    | ScraperInSISStudyPlansRequestJob
    | ScraperInSISStudyPlanRequestJob

export default ScraperRequestJob
