import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import ScraperInSISCatalog from '@scraper/Interfaces/ScraperInSISCatalog'
import ScraperInSISCourse from '@scraper/Interfaces/ScraperInSISCourse'
import ScraperJob from '@scraper/Types/ScraperJob'

/**
 * Base configuration shared by all scraper response jobs.
 */
interface ScraperResponseJobBase {
    /** The specific type identifier for the completed task. */
    type: ScraperJob
    /** Optional error details if the scraping process failed. */
    error?: {
        message: string
    }
}

/**
 * Payload containing the results of an events list crawl.
 */
export interface Scraper4FISEventsResponseJob extends ScraperResponseJobBase {
    type: '4FIS:Events'
    /** The collection of discovered event IDs. */
    events: Scraper4FISEvents
}

/**
 * Payload containing the results of a specific event crawl.
 */
export interface Scraper4FISEventResponseJob extends ScraperResponseJobBase {
    type: '4FIS:Event'
    /** The extracted event details, or null if parsing failed. */
    event: Scraper4FISEvent | null
}

/**
 * Payload containing the results of a course catalog crawl.
 */
export interface ScraperInSISCatalogResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:Catalog'
    /** The collection of discovered course URLs. */
    catalog: ScraperInSISCatalog
}

/**
 * Payload containing the results of a specific course crawl.
 */
export interface ScraperInSISCourseResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:Course'
    /** The extracted course details, or null if parsing failed. */
    course: ScraperInSISCourse | null
}

/**
 * Union type representing any valid scraper response job payload.
 */
type ScraperResponseJob = Scraper4FISEventsResponseJob | Scraper4FISEventResponseJob | ScraperInSISCatalogResponseJob | ScraperInSISCourseResponseJob

export default ScraperResponseJob
