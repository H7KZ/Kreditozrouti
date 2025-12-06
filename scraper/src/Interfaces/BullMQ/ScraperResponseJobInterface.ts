import FISEventInterface from '@scraper/Interfaces/FIS/FISEventInterface'
import FISEventsInterface from '@scraper/Interfaces/FIS/FISEventsInterface'
import InSISCatalogInterface from '@scraper/Interfaces/InSIS/InSISCatalogInterface'
import InSISCourseInterface from '@scraper/Interfaces/InSIS/InSISCourseInterface'
import ScraperJobType from '@scraper/Types/ScraperJobType'

/**
 * Base configuration shared by all scraper response jobs.
 */
interface ScraperResponseJobBase {
    /** The specific type identifier for the completed task. */
    type: ScraperJobType
    /** Optional error details if the scraping process failed. */
    error?: {
        message: string
        stack?: string
    }
}

/**
 * Payload containing the results of an events list crawl.
 */
export interface ScraperFISEventsResponseJobInterface extends ScraperResponseJobBase {
    type: '4FIS:Events'
    /** The collection of discovered event IDs. */
    events: FISEventsInterface
}

/**
 * Payload containing the results of a specific event crawl.
 */
export interface ScraperFISEventResponseJobInterface extends ScraperResponseJobBase {
    type: '4FIS:Event'
    /** The extracted event details, or null if parsing failed. */
    event: FISEventInterface | null
}

/**
 * Payload containing the results of a course catalog crawl.
 */
export interface ScraperInSISCatalogResponseJobInterface extends ScraperResponseJobBase {
    type: 'InSIS:Catalog'
    /** The collection of discovered course URLs. */
    catalog: InSISCatalogInterface
}

/**
 * Payload containing the results of a specific course crawl.
 */
export interface ScraperInSISCourseResponseJobInterface extends ScraperResponseJobBase {
    type: 'InSIS:Course'
    /** The extracted course details, or null if parsing failed. */
    course: InSISCourseInterface | null
}

/**
 * Union type representing any valid scraper response job payload.
 */
type ScraperResponseJobInterface =
    | ScraperFISEventsResponseJobInterface
    | ScraperFISEventResponseJobInterface
    | ScraperInSISCatalogResponseJobInterface
    | ScraperInSISCourseResponseJobInterface

export default ScraperResponseJobInterface
