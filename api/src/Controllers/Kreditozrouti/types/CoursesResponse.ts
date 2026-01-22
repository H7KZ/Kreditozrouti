import { CourseWithRelations } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem'

/**
 * Response payload containing course search results, facets, and pagination metadata.
 *
 * @route POST /kreditozrouti/courses
 */
export default interface CoursesResponse {
	/** Array of course records matching the filter criteria. */
	data: CourseWithRelations[]

	/** Aggregated facet counts for filtering. */
	facets: {
		faculties: FacetItem[]
		days: FacetItem[]
		lecturers: FacetItem[]
		languages: FacetItem[]
		levels: FacetItem[]
		semesters: FacetItem[]
		years: FacetItem[]
		groups: FacetItem[] // Only when study_plan_id filter applied
		categories: FacetItem[] // Only when study_plan_id filter applied
		ects: FacetItem[]
		modes_of_completion: FacetItem[]
		time_range: { min_time: number; max_time: number }
	}

	/** Pagination metadata. */
	meta: {
		/** The maximum number of results returned */
		limit: number
		/** The number of results skipped */
		offset: number
		/** The total number of records returned in this page */
		count: number
		/** The total number of records matching the filter criteria */
		total: number
	}
}
