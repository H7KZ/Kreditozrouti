import { StudyPlan } from '@api/Database/types'

/**
 * Represents a single facet category value and its occurrence count.
 */
interface FacetItem {
    value: string | null
    count: number
}

/**
 * Response payload containing study plan search results, facets, and pagination metadata.
 *
 * @route POST /kreditozrouti/study-plans
 */
export default interface StudyPlansResponse {
    /** Array of study plans matching the filter criteria. */
    data: StudyPlan[]

    /** Aggregated facet counts for filtering. */
    facets: {
        faculties: FacetItem[]
        levels: FacetItem[]
        semesters: FacetItem[]
        modes_of_studies: FacetItem[]
        study_lengths: FacetItem[]
    }

    /** Pagination metadata. */
    meta: {
        limit: number
        offset: number
        count: number
    }
}
