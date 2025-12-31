import { Course } from '@api/Database/types'

/**
 * Represents a single facet category value and its occurrence count.
 */
interface FacetItem {
    value: string | null
    count: number
}

/**
 * Response payload containing course search results, facets, and pagination metadata.
 *
 * @route POST /kreditozrouti/courses
 */
export default interface CoursesResponse {
    /** Array of course records matching the filter criteria. */
    data: Course[]

    /** Aggregated facet counts for filtering. */
    facets: {
        faculties: FacetItem[]
        departments: FacetItem[]
        days: FacetItem[]
        lecturers: FacetItem[]
        languages: FacetItem[]
        levels: FacetItem[]
        semesters: FacetItem[]
        time_range: {
            min_time: number
            max_time: number
        }
    }

    /** Pagination metadata. */
    meta: {
        limit: number
        offset: number
        count: number
    }
}
