import { Course } from '@api/Database/types'

/**
 * Represents a single category option in the faceted search results.
 * Used to display filter counts (e.g., "Faculty of Informatics (42)").
 */
interface FacetItem {
    /**
     * The unique identifier or label for this facet option
     *
     * @type {string | null}
     */
    value: string | null

    /**
     * The number of records matching this specific option
     *
     * @type {number}
     */
    count: number
}

/**
 * Response payload for the course search endpoint.
 * Includes the matching courses, faceted search data, and pagination metadata.
 *
 * @route GET /kreditozrouti/courses
 */
export default interface CoursesResponse {
    /**
     * The array of courses matching the search criteria
     *
     * @type {Course[]}
     */
    data: Course[]

    /**
     * Statistical data for various filter categories.
     * Provides available options and counts based on the current search context.
     */
    facets: {
        faculties: FacetItem[]
        departments: FacetItem[]
        days: FacetItem[]
        lecturers: FacetItem[]
        languages: FacetItem[]
        levels: FacetItem[]
        semesters: FacetItem[]
        time_range: {
            /** Start time in minutes from midnight */
            min_time: number
            /** End time in minutes from midnight */
            max_time: number
        }
    }

    /**
     * Pagination metadata for the current result set
     */
    meta: {
        /** The maximum number of results returned */
        limit: number
        /** The number of results skipped */
        offset: number
        /** The total number of records returned in this page */
        count: number
    }
}
