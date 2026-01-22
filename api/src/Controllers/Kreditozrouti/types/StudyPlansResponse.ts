import { Course, Faculty, StudyPlan } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem'

/**
 * Response payload containing study plan search results, facets, and pagination metadata.
 *
 * @route POST /study_plans
 */
export default interface StudyPlansResponse {
	/** Array of study plans matching the filter criteria. */
	data: StudyPlan<Faculty, Course>[]

	/** Aggregated facet counts for filtering. */
	facets: {
		faculties: FacetItem[]
		levels: FacetItem[]
		semesters: FacetItem[]
		years: FacetItem[]
		modes_of_studies: FacetItem[]
		study_lengths: FacetItem[]
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
