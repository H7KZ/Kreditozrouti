import { Nullable, SelectQueryBuilder, sql } from 'kysely'
import { mysql } from '@api/clients'
import { CoursesFilter } from '@api/Controllers/Kreditozrouti/CoursesController'
import { CourseTable, CourseUnitSlotTable, CourseUnitTable, Database, StudyPlanCourseTable } from '@api/Database/types'
import { buildSlotConflictConditions } from '@api/utils/timeConflict'

type QueryBuilder = SelectQueryBuilder<
	Database & { c1: CourseTable } & { cu1: Nullable<CourseUnitTable> } & { cus1: Nullable<CourseUnitSlotTable> } & { spc1: Nullable<StudyPlanCourseTable> } & {
		fts: Nullable<{ fts_id: number; relevance_score: number }>
	},
	'c1' | 'cu1' | 'cus1' | 'spc1' | 'fts',
	object
>

export class CourseFilterBuilder {
	/**
	 * Builds the base Kysely query for filtering courses, applying all necessary table joins
	 * and filter predicates.
	 *
	 * @param {Partial<CoursesFilter>} filters - Active filter criteria to apply.
	 * @param {string} [ignore] - The filter key to exclude for cross-filtering facet computation.
	 * @param {{ units?: boolean; slots?: boolean; studyPlan?: boolean }} [forceJoin={}] - Forces
	 *   inclusion of unit/slot/studyPlan joins even when filters don't require them (used by facet
	 *   fast-path overrides).
	 * @returns {QueryBuilder} Kysely query builder with joins and predicates applied.
	 */
	public static buildFilterQuery(
		filters: Partial<CoursesFilter>,
		ignore?: string,
		forceJoin: { units?: boolean; slots?: boolean; studyPlan?: boolean } = {}
	): QueryBuilder {
		const needsUnitsJoin = this.requiresUnitsJoin(filters, ignore) || forceJoin.units
		const needsSlotsJoin = this.requiresSlotsJoin(filters, ignore) || forceJoin.slots
		const needsStudyPlanJoin = this.requiresStudyPlanJoin(filters, ignore) || forceJoin.studyPlan

		let query: QueryBuilder = mysql.selectFrom(`${CourseTable._table} as c1`) as QueryBuilder

		if (needsUnitsJoin || needsSlotsJoin) {
			query = query.leftJoin(`${CourseUnitTable._table} as cu1`, 'c1.id', 'cu1.course_id')
		}

		if (needsSlotsJoin) {
			query = query.leftJoin(`${CourseUnitSlotTable._table} as cus1`, 'cu1.id', 'cus1.unit_id')
		}

		if (needsStudyPlanJoin) {
			query = query.leftJoin(`${StudyPlanCourseTable._table} as spc1`, 'c1.id', 'spc1.course_id')
		}

		return this.applyAllFilters(query, filters, ignore)
	}

	/**
	 * @param {Partial<CoursesFilter>} filters - Active filter criteria.
	 * @param {string} [ignore] - Filter key to skip (used for cross-filtering).
	 * @returns {boolean} true when lecturers filter is active and not ignored.
	 */
	public static requiresUnitsJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return !!filters.lecturers?.length && ignore !== 'lecturers'
	}

	/**
	 * @param {Partial<CoursesFilter>} filters - Active filter criteria.
	 * @param {string} [ignore] - Filter key to skip (used for cross-filtering).
	 * @returns {boolean} true when include_times or exclude_times filter is active and not ignored.
	 */
	public static requiresSlotsJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return (!!filters.include_times?.length && ignore !== 'include_times') || (!!filters.exclude_times?.length && ignore !== 'exclude_times')
	}

	/**
	 * @param {Partial<CoursesFilter>} filters - Active filter criteria.
	 * @param {string} [ignore] - Filter key to skip (used for cross-filtering).
	 * @returns {boolean} true when study_plan_ids, groups, or categories filter is active and not ignored.
	 */
	public static requiresStudyPlanJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return (
			(!!filters.study_plan_ids?.length && ignore !== 'study_plan_ids') ||
			(!!filters.groups?.length && ignore !== 'groups') ||
			(!!filters.categories?.length && ignore !== 'categories')
		)
	}

	/**
	 * Sanitizes a raw user search string into a boolean-mode MySQL FULLTEXT query string.
	 * Special characters are stripped, words are prefixed with `+` and `*` wildcard.
	 *
	 * @param {string} input - Raw user search string.
	 * @returns {string} Boolean-mode MySQL FULLTEXT query string with special chars stripped and
	 *   words prefixed with `+` and `*` wildcard. Returns empty string if no valid words found.
	 */
	public static sanitizeFulltextQuery(input: string): string {
		const cleaned = input.replace(/[+\-><()~*"@]/g, ' ').trim()
		if (!cleaned) return ''
		const words = cleaned.split(/\s+/).filter(w => w.length >= 2)
		return words.map(w => `+${w}*`).join(' ')
	}

	/**
	 * Applies all active filter predicates to the given query builder.
	 *
	 * @param {QueryBuilder} query - The base Kysely query builder to extend.
	 * @param {Partial<CoursesFilter>} filters - Active filter criteria.
	 * @param {string} [ignore] - Filter key to skip (used for cross-filtering).
	 * @returns {QueryBuilder} Query builder with all active filter predicates applied.
	 */
	public static applyAllFilters(query: QueryBuilder, filters: Partial<CoursesFilter>, ignore?: string) {
		// Identity filters
		if (filters.ids?.length && !['id', 'ids'].includes(ignore!)) {
			query = query.where('c1.id', 'in', filters.ids)
		}

		if (filters.idents?.length && !['ident', 'idents'].includes(ignore!)) {
			query = query.where(eb => eb.or(filters.idents!.map((v: string) => eb('c1.ident', 'like', `%${v}%`))))
		}

		if (filters.title) {
			query = query.where(eb =>
				eb.or([
					eb('c1.title', 'like', `%${filters.title}%`),
					eb('c1.title_cs', 'like', `%${filters.title}%`),
					eb('c1.title_en', 'like', `%${filters.title}%`),
					eb('c1.ident', 'like', `%${filters.title}%`)
				])
			)
		}

		// Academic period filters
		if (filters.semesters?.length && !['semester', 'semesters'].includes(ignore!) && !filters.study_plan_ids?.length) {
			query = query.where('c1.semester', 'in', filters.semesters)
		}

		if (filters.years?.length && !['year', 'years'].includes(ignore!) && !filters.study_plan_ids?.length) {
			query = query.where('c1.year', 'in', filters.years)
		}

		// Organizational filters
		if (filters.faculty_ids?.length && !['faculty_id', 'faculty_ids'].includes(ignore!)) {
			query = query.where('c1.faculty_id', 'in', filters.faculty_ids)
		}

		if (filters.levels?.length && !['level', 'levels'].includes(ignore!)) {
			query = query.where('c1.level', 'in', filters.levels)
		}

		if (filters.languages?.length && !['language', 'languages'].includes(ignore!)) {
			query = query.where(eb => eb.or(filters.languages!.map((v: string) => eb('c1.languages', 'like', `%${v}%`))))
		}

		// Time filters (only applied when slots join exists)
		if (filters.include_times?.length && !['include_times'].includes(ignore!)) {
			query = query.where(eb =>
				eb.or(
					filters
						.include_times!.filter(t => t.day !== undefined)
						.map(exc => eb.and([eb('cus1.day', '=', exc.day!), eb('cus1.time_from', '>=', exc.time_from), eb('cus1.time_to', '<=', exc.time_to)]))
				)
			)
		}

		if (filters.exclude_times?.length && !['exclude_times'].includes(ignore!)) {
			query = query.where(eb => {
				return eb.or([
					// Case 1: The course has NO units (catalog-only entry) — keep these
					eb.not(eb.exists(eb.selectFrom(`${CourseUnitTable._table} as cu2`).select('cu2.id').whereRef('cu2.course_id', '=', 'c1.id'))),
					// Case 2: The course has at least one unit with at least one NON-conflicting slot
					// INNER JOIN ensures the slot actually exists (not vacuous truth), then we verify
					// the slot does NOT match ANY of the exclusion conflict conditions
					eb.exists(
						eb
							.selectFrom(`${CourseUnitTable._table} as cu3`)
							.innerJoin(`${CourseUnitSlotTable._table} as cus3`, 'cu3.id', 'cus3.unit_id')
							.select('cus3.id')
							.whereRef('cu3.course_id', '=', 'c1.id')
							.where(ebSlot => {
								const allConflictConditions = filters.exclude_times!.flatMap(exc => buildSlotConflictConditions(ebSlot, exc, 'cus3'))
								return allConflictConditions.length > 0 ? ebSlot.not(ebSlot.or(allConflictConditions)) : ebSlot.val(true)
							})
					)
				])
			})
		}

		// Personnel filters
		if (filters.lecturers?.length && !['lecturers'].includes(ignore!)) {
			query = query.where(eb =>
				eb.or(filters.lecturers!.flatMap((v: string) => [eb('c1.lecturers', 'like', `%${v}%`), eb('cu1.lecturer', 'like', `%${v}%`)]))
			)
		}

		// Study plan filters
		if (filters.study_plan_ids?.length && !['study_plan_id', 'study_plan_ids'].includes(ignore!)) {
			query = query.where('spc1.study_plan_id', 'in', filters.study_plan_ids)
			// Deduplicate: when same ident appears across multiple study plans (different scraped versions),
			// keep only the latest version (MAX id per ident).
			query = query.where(eb =>
				eb('c1.id', '=', eb2 =>
					eb2
						.selectFrom(`${CourseTable._table} as c_dedup`)
						.innerJoin(`${StudyPlanCourseTable._table} as spc_dedup`, 'c_dedup.id', 'spc_dedup.course_id')
						.select(eb3 => eb3.fn.max('c_dedup.id').as('id'))
						.where('spc_dedup.study_plan_id', 'in', filters.study_plan_ids!)
						.whereRef('c_dedup.ident', '=', 'c1.ident')
				)
			)
		}

		if (filters.groups?.length && !['groups'].includes(ignore!)) {
			query = query.where('spc1.group', 'in', filters.groups)
		}

		if (filters.categories?.length && !['categories'].includes(ignore!)) {
			query = query.where('spc1.category', 'in', filters.categories)
		}

		// Course property filters
		if (filters.ects?.length && !['ects'].includes(ignore!)) {
			query = query.where('c1.ects', 'in', filters.ects)
		}

		if (filters.mode_of_completions?.length && !['mode_of_completion', 'mode_of_completions'].includes(ignore!)) {
			query = query.where('c1.mode_of_completion', 'in', filters.mode_of_completions)
		}

		if (filters.mode_of_deliveries?.length && !['mode_of_delivery', 'mode_of_deliveries'].includes(ignore!)) {
			query = query.where('c1.mode_of_delivery', 'in', filters.mode_of_deliveries)
		}

		// Availability filters
		if (filters.completed_course_idents?.length && !['completed_course_idents'].includes(ignore!)) {
			query = query.where('c1.ident', 'not in', filters.completed_course_idents)
		}

		// Full-text search filter
		if (filters.search && filters.search.trim().length >= 2 && ignore !== 'search') {
			const term = filters.search.trim()
			const sanitized = this.sanitizeFulltextQuery(term)

			if (sanitized) {
				const ftsQuery = mysql
					.selectFrom(`${CourseTable._table} as fts_c`)
					.select([
						'fts_c.id as fts_id',
						sql<number>`MATCH(fts_c.title_cs, fts_c.title_en, fts_c.aims_of_the_course, fts_c.learning_outcomes, fts_c.course_contents) AGAINST(${sanitized} IN BOOLEAN MODE)`.as(
							'relevance_score'
						)
					])
					.where(
						sql`MATCH(fts_c.title_cs, fts_c.title_en, fts_c.aims_of_the_course, fts_c.learning_outcomes, fts_c.course_contents) AGAINST(${sanitized} IN BOOLEAN MODE)`,
						'>',
						0
					)

				query = query.innerJoin(ftsQuery.as('fts'), join => join.onRef('c1.id', '=', 'fts.fts_id'))
			}
		}

		return query
	}

	/**
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns {boolean} true when any filter that requires table joins (times, lecturers, study
	 *   plan) is active.
	 */
	public static filtersRequireJoins(filters: CoursesFilter): boolean {
		return !!(
			filters.include_times?.length ??
			filters.exclude_times?.length ??
			filters.lecturers?.length ??
			filters.study_plan_ids?.length ??
			filters.groups?.length ??
			filters.categories?.length
		)
	}
}
