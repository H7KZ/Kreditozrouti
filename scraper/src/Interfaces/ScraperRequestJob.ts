import InSISSemester from '@scraper/Types/InSISSemester'
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
 * Request to crawl the InSIS course catalog.
 */
export interface ScraperInSISCatalogRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Catalog'

    /** Optional list of faculty titles to limit the scraping to specific faculties. */
    faculties?: string[]

    /** Optional list of academic periods (semester and year) to limit the scraping to specific periods. */
    periods?: {
        semester: InSISSemester | null
        year: number
    }[]

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
}

/**
 * Request to crawl the InSIS study plans list.
 */
export interface ScraperInSISStudyPlansRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:StudyPlans'

    /** Optional list of faculty titles to limit the scraping to specific faculties. */
    faculties?: string[]

    /** Optional list of academic periods (semester and year) to limit the scraping to specific periods. */
    periods?: {
        semester: InSISSemester | null
        year: number
    }[]

    /** Automatically queue individual study plan requests after fetching the list. */
    auto_queue_study_plans?: boolean
}

/**
 * Request to scrape a specific InSIS study plan.
 */
export interface ScraperInSISStudyPlanRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:StudyPlan'

    /** The full URL of the study plan page to scrape. */
    url: string
}

/**
 * Union type representing any valid scraper request job payload.
 */
type ScraperRequestJob = ScraperInSISCatalogRequestJob | ScraperInSISCourseRequestJob | ScraperInSISStudyPlansRequestJob | ScraperInSISStudyPlanRequestJob

export default ScraperRequestJob
