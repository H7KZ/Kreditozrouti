import { Course } from '@api/Database/types'

/**
 * Response payload containing course search results and pagination metadata.
 *
 * @route POST /study_plans/courses
 */
export default interface StudyPlanCoursesResponse {
	/** Array of course records matching the filter criteria. */
	data: Course[]

	/** Pagination metadata. */
	meta: {
		/** The total number of records returned in this page */
		count: number
		/** The total number of records matching the filter criteria */
		total: number
	}
}
