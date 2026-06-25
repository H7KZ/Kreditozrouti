import { sql } from 'kysely'
import { jsonArrayFrom } from 'kysely/helpers/mysql'
import { priorityOf } from '@shared/domain/studyPlan'
import { INSIS_DAY_NORM, LANGUAGE_NORM, LEVEL_NORM, MODE_OF_COMPLETION_NORM, MODE_OF_DELIVERY_NORM } from '@shared/domain/constants'
import { getSlotType } from '@shared/domain/insis'
import { mysql } from '@api/clients'
import { CoursesFilter } from '@api/Controllers/Kreditozrouti/CoursesController'
import {
	Course,
	CourseAssessmentTable,
	CourseTable,
	CourseUnitSlotTable,
	CourseUnitTable,
	CourseWithRelations,
	FacultyTable,
	StudyPlanCourseTable,
	StudyPlanTable
} from '@api/Database/types'
import { CourseFilterBuilder } from './CourseFilterBuilder'

export class CourseQueryService {
	/**
	 * Retrieves a paginated list of courses enriched with all relations.
	 * Orchestrates count → ID pagination → parallel relation loads → in-memory merge.
	 *
	 * @param {Partial<CoursesFilter>} filters - Partial filter criteria to apply.
	 * @param {number} [limit=20] - Maximum number of courses to return.
	 * @param {number} [offset=0] - Number of courses to skip for pagination.
	 * @returns {Promise<{ courses: CourseWithRelations[]; total: number }>} Courses enriched with
	 *   faculty, units (with slots), assessments, and study plan membership, plus total match count.
	 */
	static async getCoursesWithRelations(filters: Partial<CoursesFilter>, limit = 20, offset = 0): Promise<{ courses: CourseWithRelations[]; total: number }> {
		if (limit <= 0) return { courses: [], total: 0 }

		// 1. Count total matching courses
		const total = await this.countFilteredCourses(filters)
		if (total === 0) return { courses: [], total: 0 }

		// 2. Fetch paginated course IDs only
		const courseIds = await this.fetchPaginatedCourseIds(filters, limit, offset)
		if (courseIds.length === 0) return { courses: [], total }

		// 3. Load all relations in parallel
		const [courses, faculties, units, assessments, studyPlans] = await Promise.all([
			this.fetchCoursesByIds(courseIds),
			this.fetchFacultiesByCourseIds(courseIds),
			this.fetchUnitsWithSlotsByCourseIds(courseIds),
			this.fetchAssessmentsByCourseIds(courseIds),
			filters.study_plan_ids?.length ? this.fetchStudyPlanCoursesByCourseIds(courseIds, filters.study_plan_ids) : Promise.resolve([])
		])

		// 4. Merge relations in-memory
		const facultyMap = new Map(faculties.map(f => [f.id, f]))
		const unitsMap = this.groupBy(units, 'course_id')
		const assessmentsMap = this.groupBy(assessments, 'course_id')
		const studyPlansMap = this.groupBy(studyPlans, 'course_id')

		const enrichedCourses = courses.map(course => ({
			...course,
			mode_of_completion: MODE_OF_COMPLETION_NORM[course.mode_of_completion ?? ''] ?? course.mode_of_completion ?? null,
			languages: CourseQueryService.normalizePipeField(course.languages, LANGUAGE_NORM),
			level: LEVEL_NORM[course.level ?? ''] ?? course.level ?? null,
			mode_of_delivery: CourseQueryService.normalizeModeOfDelivery(course.mode_of_delivery),
			faculty: course.faculty_id ? (facultyMap.get(course.faculty_id) ?? null) : null,
			units: unitsMap.get(course.id) ?? [],
			assessments: assessmentsMap.get(course.id) ?? [],
			study_plans: studyPlansMap.get(course.id) ?? []
		}))

		return { courses: enrichedCourses as unknown as CourseWithRelations[], total }
	}

	/**
	 * Fetches the latest version of each course (MAX id per ident) linked to any of the given study plans.
	 *
	 * @param {number[]} studyPlanIds - Study plan IDs to filter by.
	 * @returns {Promise<Course[]>} Latest version of each course linked to any of the given study plans.
	 */
	static getCoursesByStudyPlan(studyPlanIds: number[]): Promise<Course[]> {
		return mysql
			.selectFrom(`${CourseTable._table} as c1`)
			.innerJoin(`${StudyPlanCourseTable._table} as spc1`, 'c1.id', 'spc1.course_id')
			.selectAll('c1')
			.distinct()
			.where('spc1.study_plan_id', 'in', studyPlanIds)
			.where('c1.id', '=', eb =>
				eb
					.selectFrom(`${CourseTable._table} as c2`)
					.innerJoin(`${StudyPlanCourseTable._table} as spc2`, 'c2.id', 'spc2.course_id')
					.select(eb2 => eb2.fn.max('c2.id').as('id'))
					.where('spc2.study_plan_id', 'in', studyPlanIds)
					.whereRef('c2.ident', '=', 'c1.ident')
			)
			.execute()
	}

	/**
	 * @param {Partial<CoursesFilter>} filters - Active filter criteria.
	 * @returns {Promise<number>} COUNT DISTINCT on c1.id matching the filter.
	 */
	static async countFilteredCourses(filters: Partial<CoursesFilter>): Promise<number> {
		const query = CourseFilterBuilder.buildFilterQuery(filters).select(eb => eb.fn.count<number>('c1.id').distinct().as('total'))

		const result = await query.executeTakeFirst()
		return result?.total ?? 0
	}

	/**
	 * @param {Partial<CoursesFilter>} filters - Active filter criteria.
	 * @param {number} limit - Maximum number of IDs to return.
	 * @param {number} offset - Number of IDs to skip.
	 * @returns {Promise<number[]>} Ordered page of course IDs.
	 */
	static async fetchPaginatedCourseIds(filters: Partial<CoursesFilter>, limit: number, offset: number): Promise<number[]> {
		const isDefaultSort = !filters.sort_by

		let priorityFacultyId: string | null = null
		if (isDefaultSort && filters.study_plan_ids?.length) {
			// one extra query to derive faculty from study plans; avoids any API contract change
			const row = await mysql
				.selectFrom(`${StudyPlanTable._table} as sp`)
				.select('sp.faculty_id')
				.where('sp.id', 'in', filters.study_plan_ids)
				.where('sp.faculty_id', 'is not', null)
				.limit(1)
				.executeTakeFirst()
			priorityFacultyId = row?.faculty_id ?? null
		}

		let query = CourseFilterBuilder.buildFilterQuery(filters).select('c1.id').groupBy('c1.id')

		if (priorityFacultyId) {
			query = query.orderBy(sql`CASE WHEN c1.faculty_id = ${priorityFacultyId} THEN 0 ELSE 1 END`).orderBy(sql.ref('c1.ident'), 'asc')
		} else {
			query = query.orderBy(this.resolveSortColumn(filters.sort_by, 'c1'), filters.sort_dir ?? 'asc')
		}

		const results = await query.limit(limit).offset(offset).execute()
		return results.map(r => r.id)
	}

	/**
	 * Fetches course rows for the given IDs, preserving the order of the input array
	 * via a MySQL FIELD() sort expression.
	 *
	 * @param {number[]} ids - Array of course IDs to fetch.
	 * @returns Courses in the same order as ids (FIELD() sort).
	 */
	static fetchCoursesByIds(ids: number[]) {
		return mysql
			.selectFrom(`${CourseTable._table} as c1`)
			.selectAll('c1')
			.where('c1.id', 'in', ids)
			.orderBy(sql`FIELD(c1.id, ${sql.join(ids)})`)
			.execute()
	}

	/**
	 * @param {number[]} courseIds - Array of course IDs.
	 * @returns Faculty rows for all faculties referenced by the given courses.
	 */
	static fetchFacultiesByCourseIds(courseIds: number[]) {
		return mysql
			.selectFrom(`${FacultyTable._table} as f1`)
			.selectAll('f1')
			.where(
				'f1.id',
				'in',
				mysql.selectFrom(`${CourseTable._table} as c1`).select('c1.faculty_id').where('c1.id', 'in', courseIds).where('c1.faculty_id', 'is not', null)
			)
			.execute()
	}

	/**
	 * @param {number[]} courseIds - Array of course IDs.
	 * @returns Course units with embedded slots array (jsonArrayFrom).
	 */
	static async fetchUnitsWithSlotsByCourseIds(courseIds: number[]) {
		const units = await mysql
			.selectFrom(`${CourseUnitTable._table} as cu1`)
			.selectAll('cu1')
			.select(eb => [
				jsonArrayFrom(
					eb
						.selectFrom(`${CourseUnitSlotTable._table} as cus1`)
						.select([
							'cus1.id',
							'cus1.unit_id',
							'cus1.created_at',
							'cus1.updated_at',
							'cus1.type',
							'cus1.frequency',
							'cus1.date',
							'cus1.day',
							'cus1.time_from',
							'cus1.time_to',
							'cus1.location'
						])
						.whereRef('cus1.unit_id', '=', 'cu1.id')
				).as('slots')
			])
			.where('cu1.course_id', 'in', courseIds)
			.execute()

		return units.map(u => ({
			...u,
			slots: (u.slots ?? []).map(slot => ({
				...slot,
				day:  slot.day  ? (INSIS_DAY_NORM[slot.day] ?? null) : null,
				type: getSlotType({ type: slot.type })
			}))
		}))
	}

	/**
	 * @param {number[]} courseIds - Array of course IDs.
	 * @returns Assessment rows for the given course IDs.
	 */
	static fetchAssessmentsByCourseIds(courseIds: number[]) {
		return mysql.selectFrom(`${CourseAssessmentTable._table} as ca1`).selectAll('ca1').where('ca1.course_id', 'in', courseIds).execute()
	}

	/**
	 * @param {number[]} courseIds - Array of course IDs.
	 * @param {number[]} studyPlanIds - Array of study plan IDs to restrict the join.
	 * @returns study_plan_course rows linking the given courses to the given study plans, deduplicated to best row per course_id.
	 */
	static async fetchStudyPlanCoursesByCourseIds(courseIds: number[], studyPlanIds: number[]) {
		const rows = await mysql
			.selectFrom(`${StudyPlanCourseTable._table} as spc1`)
			.selectAll('spc1')
			.where('spc1.course_id', 'in', courseIds)
			.where('spc1.study_plan_id', 'in', studyPlanIds)
			.execute()

		// Keep only the best-priority row per course_id so CourseInfo.vue shows one badge.
		const best = new Map<number, (typeof rows)[number]>()
		for (const row of rows) {
			const current = best.get(row.course_id)
			if (!current || priorityOf(row.group, row.category) < priorityOf(current.group, current.category)) {
				best.set(row.course_id, row)
			}
		}
		return [...best.values()]
	}

	private static normalizePipeField(raw: string | null, norm: Record<string, string>): string | null {
		if (!raw) return null
		return raw.split('|').map(v => norm[v.trim()] ?? v.trim()).join('|')
	}

	private static normalizeModeOfDelivery(raw: string | null): string | null {
		if (!raw) return null
		const prefix = raw.split(';')[0]?.trim() ?? ''
		return MODE_OF_DELIVERY_NORM[prefix] ?? prefix
	}

	private static resolveSortColumn(sortBy?: string, tableAlias = 'c1'): ReturnType<typeof sql.ref> {
		const sortMap: Record<string, string> = {
			relevance: 'fts.relevance_score',
			ident: `${tableAlias}.ident`,
			title: `${tableAlias}.title`,
			ects: `${tableAlias}.ects`,
			faculty: `${tableAlias}.faculty_id`,
			year: `${tableAlias}.year`,
			semester: `${tableAlias}.semester`
		}

		const col = sortMap[sortBy ?? 'ident'] ?? `${tableAlias}.ident`
		return sql.ref(col)
	}

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
