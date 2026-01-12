import ScraperInSISCatalog from '@scraper/Interfaces/ScraperInSISCatalog'
import ScraperInSISCourse from '@scraper/Interfaces/ScraperInSISCourse'
import ScraperInSISStudyPlan from '@scraper/Interfaces/ScraperInSISStudyPlan'
import ScraperInSISStudyPlans from '@scraper/Interfaces/ScraperInSISStudyPlans'
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
 * Response payload containing the results of a course catalog crawl.
 */
export interface ScraperInSISCatalogResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:Catalog'
    catalog: ScraperInSISCatalog
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
 * Response payload containing the results of a specific course crawl.
 */
export interface ScraperInSISCourseResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:Course'
    course: ScraperInSISCourse | null
}

/**
 * Response payload containing the results of a study plans list crawl.
 */
export interface ScraperInSISStudyPlansResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:StudyPlans'
    plans: ScraperInSISStudyPlans
}

/**
 * Response payload containing the results of a specific study plan crawl.
 */
export interface ScraperInSISStudyPlanResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:StudyPlan'
    plan: ScraperInSISStudyPlan | null
}

/**
 * Union type representing any valid scraper response job payload.
 */
type ScraperResponseJob = ScraperInSISCatalogResponseJob | ScraperInSISCourseResponseJob | ScraperInSISStudyPlansResponseJob | ScraperInSISStudyPlanResponseJob

export default ScraperResponseJob
