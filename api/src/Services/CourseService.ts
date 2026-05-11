import { mysql, redis } from '@api/clients'
import { CoursesFilter } from '@api/Controllers/Kreditozrouti/CoursesController'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import {
	Course,
	CourseAssessmentTable,
	CourseTable,
	CourseUnitSlotTable,
	CourseUnitTable,
	CourseWithRelations,
	Database,
	ExcludeMethods,
	FacultyTable,
	StudyPlanCourseTable
} from '@api/Database/types'
import { buildSlotConflictConditions, compareTimeSelections } from '@api/utils/timeConflict'
import type { FacetItem } from '@shared/http/facets'
import { Nullable, SelectQueryBuilder, sql } from 'kysely'
import { jsonArrayFrom } from 'kysely/helpers/mysql'

/** Cache TTL for facet queries (5 minutes) - facets change infrequently */
const FACET_CACHE_TTL = 300
const FACET_CACHE_PREFIX = 'course:facets:'

type QueryBuilder = SelectQueryBuilder<
	Database & { c1: CourseTable } & { cu1: Nullable<CourseUnitTable> } & { cus1: Nullable<CourseUnitSlotTable> } & { spc1: Nullable<StudyPlanCourseTable> },
	'c1' | 'cu1' | 'cus1' | 'spc1',
	object
>

/**
 * Service for Course-related database operations.
 *
 * Uses an optimized query pattern to avoid N+1 problems:
 * 1. Count filtered results (with conditional joins)
 * 2. Fetch paginated IDs only
 * 3. Load all relations in parallel (4 queries max)
 * 4. Merge in-memory
 *
 * This approach scales consistently regardless of page size.
 */
export default class CourseService {
	// ─── Public API ───────────────────────────────────────────────────────────────

	/**
	 * Retrieves a paginated list of courses with deep relations.
	 *
	 * Loads faculty, units (with slots), assessments, and study plan associations
	 * using parallel relation loading instead of correlated subqueries.
	 * This reduces N+1 to 4-5 total queries regardless of result size.
	 *
	 * @param filters - Filter criteria for courses
	 * @param limit - Maximum number of results (default: 20)
	 * @param offset - Number of results to skip for pagination
	 * @returns Object containing enriched courses and total count
	 *
	 * @example
	 * ```ts
	 * const { courses, total } = await CourseService.getCoursesWithRelations(
	 *   { faculty_ids: [1], semesters: ['WS'], years: [2024] },
	 *   20,
	 *   0
	 * )
	 * ```
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
			faculty: facultyMap.get(course.faculty_id!) ?? null,
			units: unitsMap.get(course.id) ?? [],
			assessments: assessmentsMap.get(course.id) ?? [],
			study_plans: studyPlansMap.get(course.id) ?? []
		}))

		return { courses: enrichedCourses as CourseWithRelations[], total }
	}

	/**
	 * Retrieves courses associated with specific study plans.
	 *
	 * @param studyPlanIds - IDs of the study plans to query
	 * @returns Array of courses linked to the given study plans
	 */
	static async getCoursesByStudyPlan(studyPlanIds: number[]): Promise<Course[]> {
		return mysql
			.selectFrom(`${CourseTable._table} as c1`)
			.innerJoin(`${StudyPlanCourseTable._table} as spc1`, 'c1.id', 'spc1.course_id')
			.selectAll('c1')
			.where('spc1.study_plan_id', 'in', studyPlanIds)
			.where('c1.id', '=', eb =>
				eb
					.selectFrom(`${CourseTable._table} as c2`)
					.innerJoin(`${StudyPlanCourseTable._table} as spc2`, 'c2.id', 'spc2.course_id')
					.select(eb2 => eb2.fn.min('c2.id').as('id'))
					.where('spc2.study_plan_id', 'in', studyPlanIds)
					.whereRef('c2.ident', '=', 'c1.ident')
			)
			.execute()
	}

	/**
	 * Retrieves facet counts for the filtering UI (dropdowns, checkboxes).
	 * Results are cached in Redis to reduce DB load.
	 *
	 * @param filters - Current filter state (affects available facet values)
	 * @returns Object containing count arrays for each facetable field
	 */
	static async getCourseFacets(filters: CoursesFilter) {
		const cacheKey = this.buildFacetCacheKey(filters)

		const cached = await this.readFacetsFromCache(cacheKey)
		if (cached) return cached

		const facets = await this.computeAllFacets(filters)

		await this.writeFacetsToCache(cacheKey, facets)

		return facets
	}

	// ─── Querying ─────────────────────────────────────────────────────────────────

	/**
	 * Counts courses matching the given filters.
	 * Uses COUNT(DISTINCT) to handle potential duplicates from joins.
	 */
	private static async countFilteredCourses(filters: Partial<CoursesFilter>): Promise<number> {
		const query = this.buildFilterQuery(filters).select(eb => eb.fn.count<number>('c1.id').distinct().as('total'))

		const result = await query.executeTakeFirst()
		return result?.total ?? 0
	}

	/**
	 * Fetches only the IDs of courses for the current page.
	 * Keeps the initial query lightweight before loading full relations.
	 */
	private static async fetchPaginatedCourseIds(filters: Partial<CoursesFilter>, limit: number, offset: number): Promise<number[]> {
		const results = await this.buildFilterQuery(filters)
			.select('c1.id')
			.groupBy('c1.id')
			.orderBy(this.resolveSortColumn(filters.sort_by, 'c1'), filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)
			.execute()

		return results.map(r => r.id)
	}

	// ─── Relations ────────────────────────────────────────────────────────────────

	/**
	 * Fetches full course records by IDs, preserving the original order.
	 * Uses MySQL's FIELD() function to maintain pagination order.
	 */
	private static async fetchCoursesByIds(ids: number[]) {
		return mysql
			.selectFrom(`${CourseTable._table} as c1`)
			.selectAll('c1')
			.where('c1.id', 'in', ids)
			.orderBy(sql`FIELD(c1.id, ${sql.join(ids)})`)
			.execute()
	}

	/**
	 * Fetches faculties associated with the given course IDs.
	 * Uses a subquery to load only referenced faculties.
	 */
	private static async fetchFacultiesByCourseIds(courseIds: number[]) {
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
	 * Fetches course units with their time slots using Kysely's jsonArrayFrom helper.
	 * Slots are nested directly into each unit to avoid additional mapping.
	 */
	private static async fetchUnitsWithSlotsByCourseIds(courseIds: number[]) {
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
			slots: u.slots ?? []
		}))
	}

	/** Fetches all assessments for the given course IDs. */
	private static async fetchAssessmentsByCourseIds(courseIds: number[]) {
		return mysql.selectFrom(`${CourseAssessmentTable._table} as ca1`).selectAll('ca1').where('ca1.course_id', 'in', courseIds).execute()
	}

	/**
	 * Fetches study plan course associations for given courses and plans.
	 * Only called when the study_plan_ids filter is active.
	 */
	private static async fetchStudyPlanCoursesByCourseIds(courseIds: number[], studyPlanIds: number[]) {
		return mysql
			.selectFrom(`${StudyPlanCourseTable._table} as spc1`)
			.selectAll('spc1')
			.where('spc1.course_id', 'in', courseIds)
			.where('spc1.study_plan_id', 'in', studyPlanIds)
			.execute()
	}

	// ─── Filtering ────────────────────────────────────────────────────────────────

	/**
	 * Builds the base filter query with conditional joins.
	 * Only joins tables that are actually needed by the active filters.
	 *
	 * @param filters - Filter criteria
	 * @param ignore - Filter key to exclude (used for facet computation to avoid self-filtering)
	 * @param forceJoin - Force specific joins regardless of active filters
	 * @returns Kysely query builder with applied joins and WHERE conditions
	 */
	private static buildFilterQuery(
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

	/** Returns true when the units table join is required by active filters. */
	private static requiresUnitsJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return !!filters.lecturers?.length && ignore !== 'lecturers'
	}

	/** Returns true when the slots table join is required by active filters. */
	private static requiresSlotsJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return (!!filters.include_times?.length && ignore !== 'include_times') || (!!filters.exclude_times?.length && ignore !== 'exclude_times')
	}

	/** Returns true when the study plan join is required by active filters. */
	private static requiresStudyPlanJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return (
			(!!filters.study_plan_ids?.length && ignore !== 'study_plan_ids') ||
			(!!filters.groups?.length && ignore !== 'groups') ||
			(!!filters.categories?.length && ignore !== 'categories')
		)
	}

	private static sanitizeFulltextQuery(input: string): string {
		const cleaned = input.replace(/[+\-><()~*"@]/g, ' ').trim()
		if (!cleaned) return ''
		const words = cleaned.split(/\s+/).filter(w => w.length >= 2)
		return words.map(w => `+${w}*`).join(' ')
	}

	/**
	 * Applies all filter conditions to the query builder.
	 *
	 * Filter categories:
	 * - Identity: ids, idents, title
	 * - Academic period: semesters, years
	 * - Organizational: faculty_ids, levels, languages
	 * - Time: include_times, exclude_times
	 * - Personnel: lecturers
	 * - Study plan: study_plan_ids, groups, categories
	 * - Course properties: ects, mode_of_completion, mode_of_delivery
	 * - Availability: completed_course_idents
	 *
	 * @param query - Kysely query builder
	 * @param filters - Filter criteria
	 * @param ignore - Filter key to skip (for facet cross-filtering)
	 */
	private static applyAllFilters(query: QueryBuilder, filters: Partial<CoursesFilter>, ignore?: string) {
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
		if (filters.semesters?.length && !['semester', 'semesters'].includes(ignore!)) {
			query = query.where('c1.semester', 'in', filters.semesters)
		}

		if (filters.years?.length && !['year', 'years'].includes(ignore!)) {
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
				/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
				query = query.innerJoin(
					(eb: any) =>
						eb
							.selectFrom('insis_courses as fts_c')
							.select([
								'fts_c.id as fts_id',
								sql`MATCH(fts_c.title_cs, fts_c.title_en, fts_c.aims_of_the_course, fts_c.learning_outcomes, fts_c.course_contents) AGAINST(${sanitized} IN BOOLEAN MODE)`.as(
									'relevance_score'
								)
							])
							.where(
								sql`MATCH(fts_c.title_cs, fts_c.title_en, fts_c.aims_of_the_course, fts_c.learning_outcomes, fts_c.course_contents) AGAINST(${sanitized} IN BOOLEAN MODE)`,
								'>',
								0
							)
							.as('fts'),
					(join: any) => join.onRef('c1.id', '=', 'fts.fts_id')
				) as any
				/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
			}
		}

		return query
	}

	// ─── Facets ───────────────────────────────────────────────────────────────────

	/**
	 * Computes all facets in parallel for maximum efficiency.
	 * Each facet query excludes its own filter to show all possible values
	 * (cross-filtering pattern).
	 */
	private static async computeAllFacets(filters: CoursesFilter) {
		const [faculties, days, lecturersRaw, languagesRaw, levels, semesters, years, groups, categories, ects, modesOfCompletion, timeRange] =
			await Promise.all([
				this.getSimpleFacet(filters, 'faculty_id'),
				this.getDayFacet(filters),
				this.getLecturerFacet(filters),
				this.getLanguageFacet(filters),
				this.getSimpleFacet(filters, 'level'),
				this.getSimpleFacet(filters, 'semester'),
				this.getSimpleFacet(filters, 'year'),
				this.getGroupFacet(filters),
				this.getCategoryFacet(filters),
				this.getSimpleFacet(filters, 'ects'),
				this.getSimpleFacet(filters, 'mode_of_completion'),
				this.getTimeRangeFacet(filters)
			])

		const lecturers = this.splitPipeDelimitedFacet(lecturersRaw, 50)
		const languages = this.splitPipeDelimitedFacet(languagesRaw)

		return {
			faculties,
			days,
			lecturers,
			languages,
			levels,
			semesters,
			years,
			groups,
			categories,
			ects,
			modes_of_completion: modesOfCompletion,
			time_range: timeRange
		}
	}

	/**
	 * Computes facet counts for a simple column on the courses table.
	 *
	 * Uses a fast path (direct table query) when no complex filters are active,
	 * falling back to the full join query when necessary.
	 *
	 * Cross-filtering: applies all filters EXCEPT the one being computed,
	 * so users see available options given their other active selections.
	 *
	 * @param filters - Current filter state
	 * @param column - Column to compute facet for
	 */
	private static async getSimpleFacet(filters: CoursesFilter, column: keyof ExcludeMethods<Course>): Promise<FacetItem[]> {
		const needsComplexQuery = this.filtersRequireJoins(filters)

		if (!needsComplexQuery) {
			// FAST PATH: Direct query on courses table only
			// Apply all filters EXCEPT the one we're computing (cross-filtering)
			return mysql
				.selectFrom(`${CourseTable._table} as c1`)
				.select(`c1.${column} as value`)
				.select(eb => eb.fn.count<number>('c1.id').as('count'))
				.where(`c1.${column}`, 'is not', null)
				.$if(!!filters.ids?.length && column !== 'id', q => q.where('c1.id', 'in', filters.ids!))
				.$if(!!filters.idents?.length && column !== 'ident', q =>
					q.where(eb => eb.or(filters.idents!.map((v: string) => eb('c1.ident', 'like', `%${v}%`))))
				)
				.$if(!!filters.title, q =>
					q.where(eb =>
						eb.or([
							eb('c1.title', 'like', `%${filters.title}%`),
							eb('c1.title_cs', 'like', `%${filters.title}%`),
							eb('c1.title_en', 'like', `%${filters.title}%`),
							eb('c1.ident', 'like', `%${filters.title}%`)
						])
					)
				)
				.$if(!!filters.faculty_ids?.length && column !== 'faculty_id', q => q.where('c1.faculty_id', 'in', filters.faculty_ids!))
				.$if(!!filters.semesters?.length && column !== 'semester', q => q.where('c1.semester', 'in', filters.semesters!))
				.$if(!!filters.years?.length && column !== 'year', q => q.where('c1.year', 'in', filters.years!))
				.$if(!!filters.levels?.length && column !== 'level', q => q.where('c1.level', 'in', filters.levels!))
				.$if(!!filters.ects?.length && column !== 'ects', q => q.where('c1.ects', 'in', filters.ects!))
				.$if(!!filters.mode_of_completions?.length && column !== 'mode_of_completion', q =>
					q.where('c1.mode_of_completion', 'in', filters.mode_of_completions!)
				)
				.$if(!!filters.mode_of_deliveries?.length && column !== 'mode_of_delivery', q =>
					q.where('c1.mode_of_delivery', 'in', filters.mode_of_deliveries!)
				)
				.$if(!!filters.languages?.length && column !== 'languages', q =>
					q.where(eb => eb.or(filters.languages!.map((v: string) => eb('c1.languages', 'like', `%${v}%`))))
				)
				.groupBy(`c1.${column}`)
				.orderBy('count', 'desc')
				.execute()
		}

		// SLOW PATH: Filters require joins — use the full filter query
		return this.buildFilterQuery(filters, column as string)
			.select(`c1.${column} as value`)
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where(`c1.${column}`, 'is not', null)
			.groupBy(`c1.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Computes day-of-week facet from course unit slots.
	 * Always requires the slots join.
	 */
	private static async getDayFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildFilterQuery(filters, 'include_times', { slots: true })
			.select('cus1.day as value')
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where('cus1.day', 'is not', null)
			.groupBy('cus1.day')
			.orderBy('value')
			.execute()
	}

	/**
	 * Computes lecturer facet from both course-level and unit-level lecturers.
	 * Uses COALESCE to prefer unit-level lecturer when available.
	 */
	private static async getLecturerFacet(filters: CoursesFilter) {
		return this.buildFilterQuery(filters, 'lecturers', { units: true })
			.select(sql<string>`COALESCE(cu1.lecturer, c1.lecturers)`.as('value'))
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where(sql`COALESCE(cu1.lecturer, c1.lecturers)`, 'is not', null)
			.groupBy(sql`COALESCE(cu1.lecturer, c1.lecturers)`)
			.orderBy('count', 'desc')
			.limit(50)
			.execute()
	}

	/** Computes language facet (pipe-delimited values handled in post-processing). */
	private static async getLanguageFacet(filters: CoursesFilter) {
		return this.buildFilterQuery(filters, 'languages')
			.select('c1.languages as value')
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where('c1.languages', 'is not', null)
			.groupBy('c1.languages')
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Computes group facet from study plan course associations.
	 * Only available when filtering by study_plan_ids.
	 */
	private static async getGroupFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_ids) return []
		return this.buildFilterQuery(filters, 'groups', { studyPlan: true })
			.select('spc1.group as value')
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where('spc1.group', 'is not', null)
			.groupBy('spc1.group')
			.orderBy('value')
			.execute()
	}

	/**
	 * Computes category facet from study plan course associations.
	 * Only available when filtering by study_plan_ids.
	 */
	private static async getCategoryFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_ids) return []
		return this.buildFilterQuery(filters, 'categories', { studyPlan: true })
			.select('spc1.category as value')
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where('spc1.category', 'is not', null)
			.groupBy('spc1.category')
			.orderBy('value')
			.execute()
	}

	/**
	 * Computes the min/max time range across all course slots.
	 * Used to populate the time range slider in the UI.
	 *
	 * @returns Object with min_time and max_time in minutes from midnight
	 */
	private static async getTimeRangeFacet(filters: CoursesFilter) {
		const result = await this.buildFilterQuery(filters, 'include_times', { slots: true })
			.select(eb => [eb.fn.min<number>('cus1.time_from').as('min_time'), eb.fn.max<number>('cus1.time_to').as('max_time')])
			.where('cus1.time_from', 'is not', null)
			.executeTakeFirst()

		return {
			min_time: result?.min_time ?? 0,
			max_time: result?.max_time ?? 1440
		}
	}

	/** Returns true when any active filter requires table joins (units, slots, or study plans). */
	private static filtersRequireJoins(filters: CoursesFilter): boolean {
		return !!(
			filters.include_times?.length ??
			filters.exclude_times?.length ??
			filters.lecturers?.length ??
			filters.study_plan_ids?.length ??
			filters.groups?.length ??
			filters.categories?.length
		)
	}

	// ─── Cache ────────────────────────────────────────────────────────────────────

	/**
	 * Generates a deterministic cache key from relevant filter values.
	 * Only includes filters that significantly affect facet distribution.
	 */
	private static buildFacetCacheKey(filters: CoursesFilter): string {
		const relevantFilters = {
			ids: filters.ids?.sort(),
			idents: filters.idents?.sort(),
			title: filters.title,
			search: filters.search,
			faculty_ids: filters.faculty_ids?.sort(),
			semesters: filters.semesters?.sort(),
			years: filters.years?.sort(),
			levels: filters.levels?.sort(),
			ects: filters.ects?.sort(),
			mode_of_completions: filters.mode_of_completions?.sort(),
			mode_of_deliveries: filters.mode_of_deliveries?.sort(),
			languages: filters.languages?.sort(),
			study_plan_ids: filters.study_plan_ids?.sort(),
			lecturers: filters.lecturers?.sort(),
			groups: filters.groups?.sort(),
			categories: filters.categories?.sort(),
			include_times: filters.include_times
				? filters.include_times.map(t => ({ day: t.day, time_from: t.time_from, time_to: t.time_to })).sort(compareTimeSelections)
				: undefined,
			exclude_times: filters.exclude_times
				? filters.exclude_times.map(t => ({ day: t.day, time_from: t.time_from, time_to: t.time_to })).sort(compareTimeSelections)
				: undefined,
			completed_course_idents: filters.completed_course_idents?.sort()
		}

		const hash = Buffer.from(JSON.stringify(relevantFilters)).toString('base64')
		return `${FACET_CACHE_PREFIX}${hash}`
	}

	private static async readFacetsFromCache(key: string): Promise<CoursesResponse['facets'] | null> {
		try {
			const cached = await redis.get(key)
			return cached ? (JSON.parse(cached) as CoursesResponse['facets']) : null
		} catch {
			return null
		}
	}

	private static async writeFacetsToCache(key: string, facets: CoursesResponse['facets']): Promise<void> {
		try {
			await redis.setex(key, FACET_CACHE_TTL, JSON.stringify(facets))
		} catch {
			// Silently fail cache write
		}
	}

	// ─── Utilities ────────────────────────────────────────────────────────────────

	/**
	 * Splits pipe-delimited facet values into individual entries and aggregates
	 * their counts (e.g. "EN|CS" → separate EN and CS entries).
	 *
	 * @param data - Raw facet data with potentially pipe-delimited values
	 * @param limit - Optional max number of results to return
	 */
	private static splitPipeDelimitedFacet(data: { value: string | null; count: number }[], limit?: number): FacetItem[] {
		const map = new Map<string, number>()

		for (const row of data) {
			if (!row.value) continue

			const parts = row.value.split('|').filter(s => s.trim().length > 0)
			for (const part of parts) {
				const trimmed = part.trim()
				const currentCount = map.get(trimmed) ?? 0
				map.set(trimmed, currentCount + Number(row.count))
			}
		}

		const result = Array.from(map.entries())
			.map(([value, count]) => ({ value, count }))
			.sort((a, b) => b.count - a.count)

		return limit ? result.slice(0, limit) : result
	}

	/** Maps the sort_by parameter to the corresponding database column expression. */
	private static resolveSortColumn(sortBy?: string, tableAlias = 'c1'): ReturnType<typeof sql.ref> | ReturnType<typeof sql.raw> {
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
		return col === 'fts.relevance_score' ? sql.raw(col) : sql.ref(col)
	}

	/**
	 * Groups an array of objects by a specified key.
	 * Used for efficient in-memory relation mapping after parallel queries.
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
