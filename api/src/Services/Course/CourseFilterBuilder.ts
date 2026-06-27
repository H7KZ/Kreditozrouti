import type { InSISDay } from '@shared/domain/insis'
import { AliasedExpression, Nullable, SelectQueryBuilder, sql } from 'kysely'
import { ASSESSMENT_BUCKETS } from '@shared/domain/assessment'
import { INSIS_DAY_DENORM, LANGUAGE_DENORM, LEVEL_DENORM, MODE_OF_COMPLETION_DENORM } from '@shared/domain/constants'
import { mysql } from '@api/clients'
import { CoursesFilter } from '@api/Controllers/Courses/CoursesController'
import { CourseAssessmentTable, CourseTable, CourseUnitSlotTable, CourseUnitTable, Database, StudyPlanCourseTable } from '@api/Database/types'
import { buildSlotConflictConditions } from '@api/Utils/TimeConflict'

type QueryBuilder = SelectQueryBuilder<
	Database & { c1: CourseTable } & { cu1: Nullable<CourseUnitTable> } & { cus1: Nullable<CourseUnitSlotTable> } & { spc1: Nullable<StudyPlanCourseTable> } & {
		ca1: Nullable<CourseAssessmentTable>
	} & {
		fts: Nullable<{ fts_id: number; relevance_score: number }>
	},
	'c1' | 'cu1' | 'cus1' | 'spc1' | 'ca1' | 'fts',
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
		forceJoin: { units?: boolean; slots?: boolean; studyPlan?: boolean; assessments?: boolean } = {}
	): QueryBuilder {
		const needsUnitsJoin = this.requiresUnitsJoin(filters, ignore) || forceJoin.units
		const needsSlotsJoin = this.requiresSlotsJoin(filters, ignore) || forceJoin.slots
		const needsStudyPlanJoin = this.requiresStudyPlanJoin(filters, ignore) || forceJoin.studyPlan
		const needsAssessmentsJoin = (!!filters.assessment_methods?.length && ignore !== 'assessment_methods') || forceJoin.assessments

		let query: QueryBuilder = mysql.selectFrom(`${CourseTable._table} as c1`) as QueryBuilder

		if (needsUnitsJoin || needsSlotsJoin) {
			query = query.leftJoin(`${CourseUnitTable._table} as cu1`, 'c1.id', 'cu1.course_id')
		}

		if (needsSlotsJoin) {
			query = query.leftJoin(`${CourseUnitSlotTable._table} as cus1`, 'cu1.id', 'cus1.unit_id')
		}

		if (needsStudyPlanJoin) {
			if (filters.study_plan_ids?.length) {
				// derived table picks the best-priority (group, category) per course
				// across the selected plans so each course has exactly one spc1 row.
				query = query.leftJoin(
					this.buildBestSpcSubquery(filters.study_plan_ids) as unknown as AliasedExpression<StudyPlanCourseTable, 'spc1'>,
					'c1.id',
					'spc1.course_id'
				)
			} else {
				query = query.leftJoin(`${StudyPlanCourseTable._table} as spc1`, 'c1.id', 'spc1.course_id')
			}
		}

		if (needsAssessmentsJoin) {
			query = query.leftJoin(`${CourseAssessmentTable._table} as ca1`, 'ca1.course_id', 'c1.id')
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
			const rawLevels = filters.levels.map(v => LEVEL_DENORM[v] ?? v)
			query = query.where('c1.level', 'in', rawLevels)
		}

		if (filters.languages?.length && !['language', 'languages'].includes(ignore!)) {
			const rawLanguages = filters.languages.map(v => LANGUAGE_DENORM[v] ?? v)
			query = query.where(eb => eb.or(rawLanguages.map((v: string) => eb('c1.languages', 'like', `%${v}%`))))
		}

		// Time filters (only applied when slots join exists)
		if (filters.include_times?.length && !['include_times'].includes(ignore!)) {
			query = query.where(eb =>
				eb.or(
					filters
						.include_times!.filter(t => t.day !== undefined)
						.map(exc =>
							eb.and([
								eb('cus1.day', '=', INSIS_DAY_DENORM[exc.day!] as InSISDay),
								eb('cus1.time_from', '<', exc.time_to),
								eb('cus1.time_to', '>', exc.time_from)
							])
						)
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

		if (filters.study_plan_ids?.length && ignore !== 'study_plan_ids') {
			query = query.where('spc1.course_id', 'is not', null)
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
			const rawModes = filters.mode_of_completions.map(v => MODE_OF_COMPLETION_DENORM[v] ?? v)
			query = query.where('c1.mode_of_completion', 'in', rawModes)
		}

		if (filters.mode_of_deliveries?.length && !['mode_of_delivery', 'mode_of_deliveries'].includes(ignore!)) {
			query = query.where('c1.mode_of_delivery', 'in', filters.mode_of_deliveries)
		}

		if (filters.assessment_methods?.length && !['assessment_methods'].includes(ignore!)) {
			query = query.where(eb =>
				eb.and(
					filters.assessment_methods!.map(bucketKey => {
						const bucket = ASSESSMENT_BUCKETS.find(b => b.key === bucketKey)
						// fall back to literal string so legacy/unknown values don't silently drop
						const methods = bucket ? [...bucket.methods] : [bucketKey]
						return eb.or(
							methods.map(method =>
								eb.exists(
									eb
										.selectFrom(`${CourseAssessmentTable._table} as ca_filter`)
										.select(sql.lit(1).as('one'))
										.whereRef('ca_filter.course_id', '=', 'c1.id')
										.where('ca_filter.method', '=', method)
								)
							)
						)
					})
				)
			)
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
	 * Returns a Kysely raw SQL fragment for a derived table that yields the single best
	 * (group, category) row per course_id across the given study plans.
	 * Used as the spc1 join target so all downstream predicates see one row per course.
	 */
	private static buildBestSpcSubquery(studyPlanIds: number[]) {
		const idList = sql.join(studyPlanIds.map(id => sql.lit(id)))
		return sql<{ course_id: number; group: string; category: string }>`(
			SELECT course_id, \`group\`, category
			FROM (
				SELECT course_id, \`group\`, category,
					ROW_NUMBER() OVER (
						PARTITION BY course_id
						ORDER BY (
							CASE \`group\`
								WHEN 'field_specific_bachelor' THEN 0
								WHEN 'field_specific_master'   THEN 10
								WHEN 'faculty_specific'        THEN 20
								WHEN 'minor_specialization'    THEN 30
								WHEN 'university_wide'         THEN 40
							END
							+
							CASE category
								WHEN 'state_exam'         THEN 0
								WHEN 'compulsory'         THEN 1
								WHEN 'elective'           THEN 2
								WHEN 'language'           THEN 3
								WHEN 'physical_education' THEN 4
								WHEN 'beyond_scope'       THEN 5
								WHEN 'exchange_program'   THEN 6
								WHEN 'prohibited'         THEN 7
							END
						) ASC
					) AS rn
				FROM ${sql.table(StudyPlanCourseTable._table)}
				WHERE study_plan_id IN (${idList})
			) ranked
			WHERE rn = 1
		)`.as('spc1')
	}

	/**
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns {boolean} true when any filter that requires table joins (times, lecturers, study
	 *   plan) is active.
	 */
	public static filtersRequireJoins(filters: CoursesFilter): boolean {
		return (
			!!filters.include_times?.length ||
			!!filters.exclude_times?.length ||
			!!filters.lecturers?.length ||
			!!filters.study_plan_ids?.length ||
			!!filters.groups?.length ||
			!!filters.categories?.length ||
			!!filters.assessment_methods?.length ||
			!!filters.search?.trim()
		)
	}
}
