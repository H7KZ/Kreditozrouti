import { sql } from 'kysely'
import { mysql } from '@api/clients'
import { StudyPlansFilter } from '@api/Controllers/Kreditozrouti/StudyPlansController'
import { Faculty, FacultyTable, StudyPlan, StudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import { StudyPlanFilterBuilder } from './StudyPlanFilterBuilder'

export class StudyPlanQueryService {
	/**
	 * Retrieves a paginated list of study plans enriched with faculty and courses relations.
	 * Orchestrates count → ID pagination → parallel relation loads → in-memory merge.
	 *
	 * @param {Partial<StudyPlansFilter>} filters - Partial filter criteria to apply.
	 * @param {number} [limit=20] - Maximum number of plans to return.
	 * @param {number} [offset=0] - Number of plans to skip for pagination.
	 * @returns {Promise<{ plans: StudyPlan<Faculty, StudyPlanCourse>[]; total: number }>}
	 *   Object containing the enriched plans array and the total count of matching plans.
	 */
	public static async getStudyPlansWithRelations(
		filters: Partial<StudyPlansFilter>,
		limit = 20,
		offset = 0
	): Promise<{ plans: StudyPlan<Faculty, StudyPlanCourse>[]; total: number }> {
		if (limit <= 0) return { plans: [], total: 0 }

		// 1. Count total matching plans
		const total = await this.getFilteredPlanCount(filters)
		if (total === 0) return { plans: [], total: 0 }

		// 2. Get paginated plan IDs only
		const planIds = await this.getPaginatedPlanIds(filters, limit, offset)
		if (planIds.length === 0) return { plans: [], total }

		// 3. Load full plans and relations in parallel
		const [plans, faculties, courses] = await Promise.all([
			this.getPlansByIds(planIds),
			this.getFacultiesForPlanIds(planIds),
			this.getCoursesForPlanIds(planIds)
		])

		// 4. Merge relations in-memory
		const facultyMap = new Map(faculties.map(f => [f.id, f]))
		const coursesMap = this.groupBy(courses, 'study_plan_id')

		const enrichedPlans = plans.map(plan => ({
			...plan,
			faculty: plan.faculty_id ? (facultyMap.get(plan.faculty_id) ?? null) : null,
			courses: coursesMap.get(plan.id) ?? []
		}))

		return { plans: enrichedPlans, total }
	}

	/**
	 * Counts the total number of study plans matching the given filters.
	 * Uses COUNT DISTINCT on sp.id to avoid duplicates from any join.
	 *
	 * @param {Partial<StudyPlansFilter>} filters - Active filter criteria.
	 * @returns {Promise<number>} Total number of plans matching the filter (COUNT DISTINCT on sp.id).
	 */
	public static async getFilteredPlanCount(filters: Partial<StudyPlansFilter>): Promise<number> {
		const query = StudyPlanFilterBuilder.buildFilterQuery(filters).select(eb => eb.fn.count<number>('sp.id').distinct().as('total'))

		const result = await query.executeTakeFirst()
		return result?.total ?? 0
	}

	/**
	 * Fetches an ordered array of plan IDs for the current pagination page.
	 *
	 * @param {Partial<StudyPlansFilter>} filters - Active filter criteria.
	 * @param {number} limit - Maximum number of IDs to return.
	 * @param {number} offset - Number of IDs to skip.
	 * @returns {Promise<number[]>} Ordered array of plan IDs for the current page.
	 */
	public static async getPaginatedPlanIds(filters: Partial<StudyPlansFilter>, limit: number, offset: number): Promise<number[]> {
		const results = await StudyPlanFilterBuilder.buildFilterQuery(filters)
			.select('sp.id')
			.groupBy('sp.id')
			.orderBy(this.getStudyPlanSortColumn(filters.sort_by), filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)
			.execute()

		return results.map(r => r.id)
	}

	/**
	 * Fetches full study plan rows for the given IDs, preserving the order of the input array
	 * via a MySQL FIELD() sort expression.
	 *
	 * @param {number[]} ids - Array of plan IDs to fetch.
	 * @returns Plans in the same order as ids (FIELD() sort).
	 */
	public static getPlansByIds(ids: number[]) {
		return mysql
			.selectFrom(`${StudyPlanTable._table} as sp`)
			.selectAll('sp')
			.where('sp.id', 'in', ids)
			.orderBy(sql`FIELD(sp.id, ${sql.join(ids)})`)
			.execute()
	}

	/**
	 * Fetches faculty rows for all faculties referenced by the given plan IDs.
	 * Uses a subquery to avoid a direct join on study_plans.
	 *
	 * @param {number[]} planIds - Array of study plan IDs.
	 * @returns Faculty rows for all faculties referenced by the given plan IDs.
	 */
	public static getFacultiesForPlanIds(planIds: number[]) {
		return mysql
			.selectFrom(`${FacultyTable._table} as f`)
			.selectAll('f')
			.where(
				'f.id',
				'in',
				mysql.selectFrom(`${StudyPlanTable._table} as sp`).select('sp.faculty_id').where('sp.id', 'in', planIds).where('sp.faculty_id', 'is not', null)
			)
			.execute()
	}

	/**
	 * Fetches all study_plan_course rows for the given plan IDs.
	 *
	 * @param {number[]} planIds - Array of study plan IDs.
	 * @returns Study_plan_course rows for all given plan IDs.
	 */
	public static getCoursesForPlanIds(planIds: number[]) {
		return mysql.selectFrom(`${StudyPlanCourseTable._table} as spc`).selectAll('spc').where('spc.study_plan_id', 'in', planIds).execute()
	}

	/**
	 * Resolves the sort column reference for the given sort_by field.
	 * Defaults to sp.ident when sortBy is undefined or unrecognised.
	 *
	 * @param {string} [sortBy] - The sort_by filter value.
	 * @returns {ReturnType<typeof sql.ref>} A Kysely sql.ref pointing to the target column.
	 */
	private static getStudyPlanSortColumn(sortBy?: string): ReturnType<typeof sql.ref> {
		const sortMap: Record<string, string> = {
			ident: 'sp.ident',
			title: 'sp.title',
			faculty_id: 'sp.faculty_id',
			year: 'sp.year',
			semester: 'sp.semester',
			level: 'sp.level'
		}
		return sql.ref(sortMap[sortBy ?? 'ident'] ?? 'sp.ident')
	}

	/**
	 * Groups an array of objects by a given key, returning a Map from key value to item array.
	 *
	 * @param {T[]} array - The array to group.
	 * @param {K} key - The property key to group by.
	 * @returns {Map<T[K], T[]>} A Map from key value to all items sharing that key value.
	 */
	private static groupBy<T, K extends keyof T>(array: T[], key: K): Map<T[K], T[]> {
		return array.reduce((map, item) => {
			const keyValue = item[key]
			const existing = map.get(keyValue) ?? []
			existing.push(item)
			map.set(keyValue, existing)
			return map
		}, new Map<T[K], T[]>())
	}
}
