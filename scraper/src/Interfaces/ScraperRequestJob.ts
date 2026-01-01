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
 * Request to crawl the main 4FIS events list.
 */
export interface Scraper4FISEventsRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Events'

    /** Automatically queue individual event requests for every event found in the list. */
    auto_queue_events?: boolean
}

/**
 * Request to scrape a specific 4FIS event.
 */
export interface Scraper4FISEventRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Event'

    /** The unique identifier of the target event to scrape. */
    eventId: string
}

/**
 * Request to crawl the 4FIS Archive.org events list.
 */
export interface Scraper4FISArchiveEventsRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Archive:Events'

    /** Automatically queue individual event requests for every archived event found. */
    auto_queue_events?: boolean
}

/**
 * Request to crawl the main 4FIS Flickr photostream for events.
 */
export interface Scraper4FISFlickrEventsRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Flickr:Events'

    /** Automatically queue individual event requests for every album found. */
    auto_queue_events?: boolean
}

/**
 * Request to scrape a specific 4FIS Flickr event album.
 */
export interface Scraper4FISFlickrEventRequestJob extends ScraperRequestJobBase {
    type: '4FIS:Flickr:Event'

    /** The unique identifier of the target Flickr event. */
    eventId: string
}

/**
 * Request to crawl the InSIS course catalog.
 */
export interface ScraperInSISCatalogRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Catalog'

    /** Automatically queue individual course requests for every course found in the catalog. */
    auto_queue_courses?: boolean
}

/**
 * Request to scrape a specific InSIS course.
 */
export interface ScraperInSISCourseRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Course'

    /** The full URL of the course page to scrape. */
    url: string

    /** Contextual metadata about the course (faculty, period) to aid parsing. */
    meta: {
        faculty: {
            id: number | null
            name: string | null
        }
        period: {
            id: number | null
            name: string | null
        }
    }
}

/**
 * Request to crawl the InSIS study plans list.
 */
export interface ScraperInSISStudyPlansRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:StudyPlans'

    /** Automatically queue individual study plan requests after fetching the list. */
    auto_queue_study_plans?: boolean

    /** Automatically queue individual course requests found within the discovered study plans. */
    auto_queue_courses?: boolean
}

/**
 * Request to scrape a specific InSIS study plan.
 */
export interface ScraperInSISStudyPlanRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:StudyPlan'

    /** Automatically queue individual course requests found within this study plan. */
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
    | Scraper4FISArchiveEventsRequestJob
    | Scraper4FISFlickrEventsRequestJob
    | Scraper4FISFlickrEventRequestJob
    | ScraperInSISCatalogRequestJob
    | ScraperInSISCourseRequestJob
    | ScraperInSISStudyPlansRequestJob
    | ScraperInSISStudyPlanRequestJob

export default ScraperRequestJob
