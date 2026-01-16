import { Course } from '@api/Database/types'

/**
 * Represents a single facet category value and its occurrence count.
 */
interface FacetItem {
	/**
	 * The unique identifier or label for this facet option
	 *
	 * @type {string | null}
	 */
	value: string | number | null

	/**
	 * The number of records matching this specific option
	 *
	 * @type {number}
	 */
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
		days: FacetItem[]
		lecturers: FacetItem[]
		languages: FacetItem[]
		levels: FacetItem[]
		semesters: FacetItem[]
		years: FacetItem[]
		time_range: {
			/** Start time in minutes from midnight */
			min_time: number
			/** End time in minutes from midnight */
			max_time: number
		}
	}

	/** Pagination metadata. */
	meta: {
		/** The maximum number of results returned */
		limit: number
		/** The number of results skipped */
		offset: number
		/** The total number of records returned in this page */
		count: number
	}
}
