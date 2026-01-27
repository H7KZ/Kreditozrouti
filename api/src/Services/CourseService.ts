import { mysql, redis } from '@api/clients'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import {
	Course,
	CourseAssessment,
	CourseAssessmentTable,
	CourseTable,
	CourseUnit,
	CourseUnitSlot,
	CourseUnitSlotTable,
	CourseUnitTable,
	Database,
	ExcludeMethods,
	Faculty,
	FacultyTable,
	StudyPlanCourse,
	StudyPlanCourseTable
} from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem'
import { TimeSelection } from '@api/Validations'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation'
import { InSISDayValues } from '@scraper/Types/InSISDay'
import { Nullable, SelectQueryBuilder, sql } from 'kysely'
import { jsonArrayFrom } from 'kysely/helpers/mysql'

/** Cache TTL for facet queries (5 minutes) - facets change infrequently */
const FACET_CACHE_TTL = 300
const FACET_CACHE_PREFIX = 'course:facets:'

type QueryBuilder = SelectQueryBuilder<
	Database & { c: CourseTable } & { u: Nullable<CourseUnitTable> } & { s: Nullable<CourseUnitSlotTable> } & { spc: Nullable<StudyPlanCourseTable> },
	'c' | 'u' | 's' | 'spc',
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
	static async getCoursesWithRelations(
		filters: Partial<CoursesFilter>,
		limit = 20,
		offset = 0
	): Promise<{ courses: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>[]; total: number }> {
		if (limit <= 0) return { courses: [], total: 0 }

		// 1. Count total matching courses
		const total = await this.getFilteredCourseCount(filters)
		if (total === 0) return { courses: [], total: 0 }

		// 2. Fetch paginated course IDs only
		const courseIds = await this.getPaginatedCourseIds(filters, limit, offset)
		if (courseIds.length === 0) return { courses: [], total }

		// 3. Load all relations in parallel
		const [courses, faculties, units, assessments, studyPlans] = await Promise.all([
			this.getCoursesByIds(courseIds),
			this.getFacultiesByIds(courseIds),
			this.getUnitsWithSlotsByIds(courseIds),
			this.getAssessmentsByIds(courseIds),
			filters.study_plan_ids?.length ? this.getStudyPlanCoursesByIds(courseIds, filters.study_plan_ids) : Promise.resolve([])
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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		return { courses: enrichedCourses as any, total }
	}

	/**
	 * Counts courses matching the given filters.
	 * Uses COUNT(DISTINCT) to handle potential duplicates from joins.
	 */
	private static async getFilteredCourseCount(filters: Partial<CoursesFilter>): Promise<number> {
		const query = this.buildFilterQuery(filters).select(eb => eb.fn.count<number>('c.id').distinct().as('total'))

		const result = await query.executeTakeFirst()
		return result?.total ?? 0
	}

	/**
	 * Fetches only the IDs of courses for the current page.
	 * Keeps the initial query lightweight before loading full relations.
	 */
	private static async getPaginatedCourseIds(filters: Partial<CoursesFilter>, limit: number, offset: number): Promise<number[]> {
		const results = await this.buildFilterQuery(filters)
			.select('c.id')
			.groupBy('c.id')
			.orderBy(this.getSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)
			.execute()

		return results.map(r => r.id)
	}

	/**
	 * Fetches full course records by IDs, preserving the original order.
	 * Uses MySQL's FIELD() function to maintain pagination order.
	 */
	private static async getCoursesByIds(ids: number[]) {
		return mysql
			.selectFrom(`${CourseTable._table} as c`)
			.selectAll('c')
			.where('c.id', 'in', ids)
			.orderBy(sql`FIELD(c.id, ${sql.join(ids)})`)
			.execute()
	}

	/**
	 * Fetches faculties associated with the given course IDs.
	 * Uses a subquery to load only referenced faculties.
	 */
	private static async getFacultiesByIds(courseIds: number[]) {
		return mysql
			.selectFrom(`${FacultyTable._table} as f`)
			.selectAll('f')
			.where(
				'f.id',
				'in',
				mysql.selectFrom(`${CourseTable._table} as c`).select('c.faculty_id').where('c.id', 'in', courseIds).where('c.faculty_id', 'is not', null)
			)
			.execute()
	}

	/**
	 * Fetches course units with their time slots using Kysely's jsonArrayFrom helper.
	 * Slots are nested directly into each unit to avoid additional mapping.
	 */
	private static async getUnitsWithSlotsByIds(courseIds: number[]) {
		const units = await mysql
			.selectFrom(`${CourseUnitTable._table} as cu`)
			.selectAll('cu')
			.select(eb => [
				jsonArrayFrom(
					eb
						.selectFrom(`${CourseUnitSlotTable._table} as s`)
						.select([
							's.id',
							's.unit_id',
							's.created_at',
							's.updated_at',
							's.type',
							's.frequency',
							's.date',
							's.day',
							's.time_from',
							's.time_to',
							's.location'
						])
						.whereRef('s.unit_id', '=', 'cu.id')
				).as('slots')
			])
			.where('cu.course_id', 'in', courseIds)
			.execute()

		return units.map(u => ({
			...u,
			slots: u.slots ?? []
		}))
	}

	/** Fetches all assessments for the given course IDs. */
	private static async getAssessmentsByIds(courseIds: number[]) {
		return mysql.selectFrom(`${CourseAssessmentTable._table} as ca`).selectAll('ca').where('ca.course_id', 'in', courseIds).execute()
	}

	/**
	 * Fetches study plan course associations for given courses and plans.
	 * Only called when study_plan_ids filter is active.
	 */
	private static async getStudyPlanCoursesByIds(courseIds: number[], studyPlanIds: number[]) {
		return mysql
			.selectFrom(`${StudyPlanCourseTable._table} as spc`)
			.selectAll('spc')
			.where('spc.course_id', 'in', courseIds)
			.where('spc.study_plan_id', 'in', studyPlanIds)
			.execute()
	}

	/**
	 * Builds the base filter query with conditional joins.
	 * Only joins tables that are actually needed by the active filters.
	 *
	 * @param filters - Filter criteria
	 * @param ignore - Filter key to exclude (used for facet computation to avoid self-filtering)
	 */
	private static buildFilterQuery(filters: Partial<CoursesFilter>, ignore?: string) {
		const needsUnitsJoin = this.needsUnitsJoin(filters, ignore)
		const needsSlotsJoin = this.needsSlotsJoin(filters, ignore)
		const needsStudyPlanJoin = this.needsStudyPlanJoin(filters, ignore)

		let query: QueryBuilder = mysql.selectFrom(`${CourseTable._table} as c`) as QueryBuilder

		if (needsUnitsJoin || needsSlotsJoin) {
			query = query.leftJoin(`${CourseUnitTable._table} as u`, 'c.id', 'u.course_id')
		}

		if (needsSlotsJoin) {
			query = query.leftJoin(`${CourseUnitSlotTable._table} as s`, 'u.id', 's.unit_id')
		}

		if (needsStudyPlanJoin) {
			query = query.leftJoin(`${StudyPlanCourseTable._table} as spc`, 'c.id', 'spc.course_id')
		}

		return this.applyFilters(query, filters, ignore)
	}

	/** Determines if units join is needed (for lecturer filters). */
	private static needsUnitsJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return !!filters.lecturers?.length && ignore !== 'lecturers'
	}

	/** Determines if slots join is needed (for time-based filters). */
	private static needsSlotsJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return (
			(!!filters.include_times?.length && ignore !== 'include_times') ||
			(!!filters.exclude_times?.length && ignore !== 'exclude_times') ||
			(!!filters.exclude_slot_ids?.length && ignore !== 'exclude_slot_ids')
		)
	}

	/** Determines if study plan join is needed (for plan/group/category filters). */
	private static needsStudyPlanJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return (
			(!!filters.study_plan_ids?.length && ignore !== 'study_plan_ids') ||
			(!!filters.groups?.length && ignore !== 'groups') ||
			(!!filters.categories?.length && ignore !== 'categories')
		)
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
	 * - Conflict: exclude_slot_ids
	 *
	 * @param query - Kysely query builder
	 * @param filters - Filter criteria
	 * @param ignore - Filter to skip (for facet computation)
	 */
	private static applyFilters(query: QueryBuilder, filters: Partial<CoursesFilter>, ignore?: string) {
		// Identity filters
		if (filters.ids?.length && !['id', 'ids'].includes(ignore!)) {
			query = query.where('c.id', 'in', filters.ids)
		}

		if (filters.idents?.length && !['ident', 'idents'].includes(ignore!)) {
			query = query.where(eb => eb.or(filters.idents!.map((v: string) => eb('c.ident', 'like', `%${v}%`))))
		}

		if (filters.title) {
			query = query.where(eb => eb.or([eb('c.title', 'like', `%${filters.title}%`), eb('c.czech_title', 'like', `%${filters.title}%`)]))
		}

		// Academic period filters
		if (filters.semesters?.length && !['semester', 'semesters'].includes(ignore!)) {
			query = query.where('c.semester', 'in', filters.semesters)
		}

		if (filters.years?.length && !['year', 'years'].includes(ignore!)) {
			query = query.where('c.year', 'in', filters.years)
		}

		// Organizational filters
		if (filters.faculty_ids?.length && !['faculty_id', 'faculty_ids'].includes(ignore!)) {
			query = query.where('c.faculty_id', 'in', filters.faculty_ids)
		}

		if (filters.levels?.length && !['level', 'levels'].includes(ignore!)) {
			query = query.where('c.level', 'in', filters.levels)
		}

		if (filters.languages?.length && !['language', 'languages'].includes(ignore!)) {
			query = query.where(eb => eb.or(filters.languages!.map((v: string) => eb('c.languages', 'like', `%${v}%`))))
		}

		// Time filters (only if slots join exists)
		if (filters.include_times?.length && !['include_times'].includes(ignore!)) {
			query = query.where(eb =>
				eb.or(
					filters.include_times!.map(exc =>
						eb.and([eb('s.day', '=', exc.day), eb('s.time_from', '>=', exc.time_from), eb('s.time_to', '<=', exc.time_to)])
					)
				)
			)
		}

		if (filters.exclude_times?.length && !['exclude_times'].includes(ignore!)) {
			query = query.where(eb =>
				eb.and(
					filters.exclude_times!.map(exc =>
						eb.or([eb('s.day', '!=', exc.day), eb('s.time_to', '<=', exc.time_from), eb('s.time_from', '>=', exc.time_to)])
					)
				)
			)
		}

		// Personnel filters
		if (filters.lecturers?.length && !['lecturers'].includes(ignore!)) {
			query = query.where(eb =>
				eb.or(filters.lecturers!.flatMap((v: string) => [eb('c.lecturers', 'like', `%${v}%`), eb('u.lecturer', 'like', `%${v}%`)]))
			)
		}

		// Study plan filters
		if (filters.study_plan_ids?.length && !['study_plan_id', 'study_plan_ids'].includes(ignore!)) {
			query = query.where('spc.study_plan_id', 'in', filters.study_plan_ids)
		}

		if (filters.groups?.length && !['groups'].includes(ignore!)) {
			query = query.where('spc.group', 'in', filters.groups)
		}

		if (filters.categories?.length && !['categories'].includes(ignore!)) {
			query = query.where('spc.category', 'in', filters.categories)
		}

		// Course properties filters
		if (filters.ects?.length && !['ects'].includes(ignore!)) {
			query = query.where('c.ects', 'in', filters.ects)
		}

		if (filters.mode_of_completions?.length && !['mode_of_completion', 'mode_of_completions'].includes(ignore!)) {
			query = query.where('c.mode_of_completion', 'in', filters.mode_of_completions)
		}

		if (filters.mode_of_deliveries?.length && !['mode_of_delivery', 'mode_of_deliveries'].includes(ignore!)) {
			query = query.where('c.mode_of_delivery', 'in', filters.mode_of_deliveries)
		}

		// Conflict exclusion
		if (filters.exclude_slot_ids?.length && !['exclude_slot_ids'].includes(ignore!)) {
			query = query.where('s.id', 'not in', filters.exclude_slot_ids)
		}

		return query
	}

	/**
	 * Retrieves facet counts for filtering UI (dropdowns, checkboxes).
	 * Results are cached in Redis to reduce DB load.
	 *
	 * @param filters - Current filter state (affects available facet values)
	 * @returns Object containing count arrays for each facetable field
	 */
	static async getCourseFacets(filters: CoursesFilter) {
		const cacheKey = this.getFacetCacheKey(filters)

		// Try cache first
		const cached = await this.getCachedFacets(cacheKey)
		if (cached) return cached

		// Compute facets
		const facets = await this.computeCourseFacets(filters)

		// Cache for 5 minutes
		await this.cacheFacets(cacheKey, facets)

		return facets
	}

	/**
	 * Computes all facets in parallel for maximum efficiency.
	 * Each facet query excludes its own filter to show all possible values.
	 */
	private static async computeCourseFacets(filters: CoursesFilter) {
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

		const lecturers = this.processPipeFacet(lecturersRaw, 50)
		const languages = this.processPipeFacet(languagesRaw)

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
		const needsComplexQuery = this.needsComplexQueryForFacet(filters)

		if (!needsComplexQuery) {
			// FAST PATH: Direct query on courses table only
			// Apply all filters EXCEPT the one we're computing (cross-filtering)
			return mysql
				.selectFrom(`${CourseTable._table} as c`)
				.select(`c.${column} as value`)
				.select(eb => eb.fn.count<number>('c.id').as('count'))
				.where(`c.${column}`, 'is not', null)
				.$if(!!filters.ids?.length && column !== 'id', q => q.where('c.id', 'in', filters.ids!))
				.$if(!!filters.idents?.length && column !== 'ident', q =>
					q.where(eb => eb.or(filters.idents!.map((v: string) => eb('c.ident', 'like', `%${v}%`))))
				)
				.$if(!!filters.title, q =>
					q.where(eb => eb.or([eb('c.title', 'like', `%${filters.title}%`), eb('c.czech_title', 'like', `%${filters.title}%`)]))
				)
				.$if(!!filters.faculty_ids?.length && column !== 'faculty_id', q => q.where('c.faculty_id', 'in', filters.faculty_ids!))
				.$if(!!filters.semesters?.length && column !== 'semester', q => q.where('c.semester', 'in', filters.semesters!))
				.$if(!!filters.years?.length && column !== 'year', q => q.where('c.year', 'in', filters.years!))
				.$if(!!filters.levels?.length && column !== 'level', q => q.where('c.level', 'in', filters.levels!))
				.$if(!!filters.ects?.length && column !== 'ects', q => q.where('c.ects', 'in', filters.ects!))
				.$if(!!filters.mode_of_completions?.length && column !== 'mode_of_completion', q =>
					q.where('c.mode_of_completion', 'in', filters.mode_of_completions!)
				)
				.$if(!!filters.mode_of_deliveries?.length && column !== 'mode_of_delivery', q =>
					q.where('c.mode_of_delivery', 'in', filters.mode_of_deliveries!)
				)
				.$if(!!filters.languages?.length && column !== 'languages', q =>
					q.where(eb => eb.or(filters.languages!.map((v: string) => eb('c.languages', 'like', `%${v}%`))))
				)
				.groupBy(`c.${column}`)
				.orderBy('count', 'desc')
				.execute()
		}

		// SLOW PATH: Need full filter query (already handles ignore correctly via buildFilterQuery)
		return this.buildFilterQuery(filters, column as string)
			.select(`c.${column} as value`)
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where(`c.${column}`, 'is not', null)
			.groupBy(`c.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}

	/** Checks if any filters require joins (units, slots, or study plans). */
	private static needsComplexQueryForFacet(filters: CoursesFilter): boolean {
		return !!(
			filters.include_times?.length ??
			filters.exclude_times?.length ??
			filters.lecturers?.length ??
			filters.study_plan_ids?.length ??
			filters.groups?.length ??
			filters.categories?.length ??
			filters.exclude_slot_ids?.length
		)
	}

	/**
	 * Computes day-of-week facet from course unit slots.
	 * Always requires slots join.
	 */
	private static async getDayFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return this.buildFilterQuery(filters, 'include_times')
			.leftJoin(`${CourseUnitTable._table} as cu`, 'c.id', 'cu.course_id')
			.leftJoin(`${CourseUnitSlotTable._table} as s`, 'cu.id', 's.unit_id')
			.select('s.day as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('s.day', 'is not', null)
			.groupBy('s.day')
			.orderBy('value')
			.execute()
	}

	/**
	 * Computes lecturer facet from both course-level and unit-level lecturers.
	 * Uses COALESCE to prefer unit-level lecturer when available.
	 */
	private static async getLecturerFacet(filters: CoursesFilter) {
		return this.buildFilterQuery(filters, 'lecturers')
			.leftJoin(`${CourseUnitTable._table} as cu`, 'c.id', 'cu.course_id')
			.select(sql<string>`COALESCE(cu.lecturer, c.lecturers)`.as('value'))
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where(sql`COALESCE(cu.lecturer, c.lecturers)`, 'is not', null)
			.groupBy(sql`COALESCE(cu.lecturer, c.lecturers)`)
			.orderBy('count', 'desc')
			.limit(50)
			.execute()
	}

	/** Computes language facet (pipe-delimited values handled in post-processing). */
	private static async getLanguageFacet(filters: CoursesFilter) {
		return this.buildFilterQuery(filters, 'languages')
			.select('c.languages as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('c.languages', 'is not', null)
			.groupBy('c.languages')
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Computes group facet from study plan course associations.
	 * Only available when filtering by study_plan_ids.
	 */
	private static async getGroupFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_ids) return []
		return this.buildFilterQuery(filters, 'groups')
			.select('spc.group as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('spc.group', 'is not', null)
			.groupBy('spc.group')
			.orderBy('value')
			.execute()
	}

	/**
	 * Computes category facet from study plan course associations.
	 * Only available when filtering by study_plan_ids.
	 */
	private static async getCategoryFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_ids) return []
		return this.buildFilterQuery(filters, 'categories')
			.select('spc.category as value')
			.select(eb => eb.fn.count<number>('c.id').distinct().as('count'))
			.where('spc.category', 'is not', null)
			.groupBy('spc.category')
			.orderBy('value')
			.execute()
	}

	/**
	 * Computes the min/max time range across all course slots.
	 * Used for time range slider in UI.
	 *
	 * @returns Object with min_time and max_time in minutes from midnight
	 */
	private static async getTimeRangeFacet(filters: CoursesFilter) {
		const result = await this.buildFilterQuery(filters, 'include_times')
			.leftJoin(`${CourseUnitTable._table} as cu`, 'c.id', 'cu.course_id')
			.leftJoin(`${CourseUnitSlotTable._table} as s`, 'cu.id', 's.unit_id')
			.select(eb => [eb.fn.min<number>('s.time_from').as('min_time'), eb.fn.max<number>('s.time_to').as('max_time')])
			.where('s.time_from', 'is not', null)
			.executeTakeFirst()

		return {
			min_time: result?.min_time ?? 0,
			max_time: result?.max_time ?? 1440
		}
	}

	/**
	 * Generates a deterministic cache key from relevant filter values.
	 * Only includes filters that significantly affect facet distribution.
	 */
	private static getFacetCacheKey(filters: CoursesFilter): string {
		const relevantFilters = {
			ids: filters.ids?.sort(),
			idents: filters.idents?.sort(),
			title: filters.title,
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
				? filters.include_times.map(t => ({ day: t.day, time_from: t.time_from, time_to: t.time_to })).sort((a, b) => this.sortTimeSelection(a, b))
				: undefined,
			exclude_times: filters.exclude_times
				? filters.exclude_times.map(t => ({ day: t.day, time_from: t.time_from, time_to: t.time_to })).sort((a, b) => this.sortTimeSelection(a, b))
				: undefined,
			exclude_slot_ids: filters.exclude_slot_ids?.sort()
		}

		const hash = Buffer.from(JSON.stringify(relevantFilters)).toString('base64')
		return `${FACET_CACHE_PREFIX}${hash}`
	}

	private static async getCachedFacets(key: string): Promise<CoursesResponse['facets'] | null> {
		try {
			const cached = await redis.get(key)
			return cached ? (JSON.parse(cached) as CoursesResponse['facets']) : null
		} catch {
			return null
		}
	}

	private static async cacheFacets(key: string, facets: CoursesResponse['facets']): Promise<void> {
		try {
			await redis.setex(key, FACET_CACHE_TTL, JSON.stringify(facets))
		} catch {
			// Silently fail cache write
		}
	}

	// /**
	//  * Invalidates all cached facet data.
	//  * Call this after course data changes (create/update/delete).
	//  */
	// static async invalidateFacetCache(): Promise<void> {
	// 	try {
	// 		const keys = await redis.keys(`${FACET_CACHE_PREFIX}*`)
	// 		if (keys.length > 0) {
	// 			await redis.del(...keys)
	// 		}
	// 	} catch {
	// 		// Silently fail
	// 	}
	// }

	/**
	 * Processes pipe-delimited facet values (e.g., "EN|CS" → separate entries).
	 * Aggregates counts across all occurrences and sorts by frequency.
	 *
	 * @param data - Raw facet data with potentially pipe-delimited values
	 * @param limit - Optional max number of results
	 */
	private static processPipeFacet(data: { value: string | null; count: number }[], limit?: number): FacetItem[] {
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

	/** Maps sort_by parameter to actual database column. */
	private static getSortColumn(sortBy?: string): string {
		const sortMap: Record<string, string> = {
			ident: 'c.ident',
			title: 'c.czech_title',
			ects: 'c.ects',
			faculty: 'c.faculty_id',
			year: 'c.year',
			semester: 'c.semester'
		}
		return sortMap[sortBy ?? 'ident'] ?? 'c.ident'
	}

	/** Sorts time selection objects by day, then start time, then end time. */
	private static sortTimeSelection(a: TimeSelection, b: TimeSelection): number {
		const aDay = InSISDayValues.indexOf(a.day)
		const bDay = InSISDayValues.indexOf(b.day)

		if (aDay !== bDay) return aDay - bDay
		if (a.time_from !== b.time_from) return a.time_from - b.time_from
		return a.time_to - b.time_to
	}

	/**
	 * Groups an array of objects by a specified key.
	 * Used for efficient in-memory relation mapping.
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
