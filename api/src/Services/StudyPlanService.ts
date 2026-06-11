import { StudyPlansFilter } from '@api/Controllers/Kreditozrouti/StudyPlansController'
import { Faculty, StudyPlan, StudyPlanCourse } from '@api/Database/types'
import { StudyPlanFacetService } from './StudyPlan/StudyPlanFacetService'
import { StudyPlanQueryService } from './StudyPlan/StudyPlanQueryService'

export default class StudyPlanService {
	/**
	 * Retrieves a paginated list of study plans enriched with faculty and course relations.
	 *
	 * @param {Partial<StudyPlansFilter>} filters - Partial filter criteria to apply.
	 * @param {number} [limit=20] - Maximum number of plans to return.
	 * @param {number} [offset=0] - Pagination offset — number of plans to skip.
	 * @returns {Promise<{ plans: StudyPlan<Faculty, StudyPlanCourse>[]; total: number }>}
	 *   Paginated plans with faculty and course relations, and the total match count.
	 */
	static getStudyPlansWithRelations(
		filters: Partial<StudyPlansFilter>,
		limit = 20,
		offset = 0
	): Promise<{ plans: StudyPlan<Faculty, StudyPlanCourse>[]; total: number }> {
		return StudyPlanQueryService.getStudyPlansWithRelations(filters, limit, offset)
	}

	/**
	 * Returns facet aggregations for all study plan filter dimensions.
	 * Results are cached in Redis for 5 minutes.
	 *
	 * @param {StudyPlansFilter} filters - The full filter object for the current request.
	 * @returns Facet aggregations for all filter dimensions (faculties, levels, semesters, etc.).
	 */
	static getStudyPlanFacets(filters: StudyPlansFilter) {
		return StudyPlanFacetService.getStudyPlanFacets(filters)
	}
}
