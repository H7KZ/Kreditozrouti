import ScraperInSISFaculty from '@scraper/Interfaces/ScraperInSISFaculty'
import InSISSemester from '@scraper/Types/InSISSemester'
import InSISStudyPlanCourseCategory from '@scraper/Types/InSISStudyPlanCourseCategory'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup'

/**
 * Represents the structure of a single scraped InSIS Study Plan.
 */
export default interface ScraperInSISStudyPlan {
    /** Unique numeric identifier for the study plan. */
    id: number

    /** Full URL source of the study plan. */
    url: string

    /** Plan code (e.g., "P-AIN"). */
    ident: string | null

    /** Title of the plan or specialization. */
    title: string | null

    /** Faculty associated with this study plan. */
    faculty: ScraperInSISFaculty | null

    /** The semester this plan applies to. */
    semester: InSISSemester | null

    /** Academic year (e.g., "2023"). */
    year: number | null

    /** Academic level (e.g., Bachelor). */
    level: string | null

    /** Mode of study (e.g., Full-time, Combined). */
    mode_of_study: string | null

    /** Standard length of study in years or semesters. */
    study_length: string | null

    /** List of courses associated with this study plan, categorized by type. */
    courses: ScraperInSISStudyPlanCourseCategory[] | null
}

/**
 * Represents a course entry within a study plan, including its categorization.
 */
export interface ScraperInSISStudyPlanCourseCategory {
    /** The ID of the course.
     * Note: May be null if the course exists in the plan text but is not a clickable link in InSIS.
     */
    id: number | null

    /** URL to the course detail page. */
    url: string | null

    /** The course code (e.g., "4IT101"). */
    ident: string

    /** Group information for the course. */
    group: InSISStudyPlanCourseGroup

    /** Category information for the course. */
    category: InSISStudyPlanCourseCategory
}
