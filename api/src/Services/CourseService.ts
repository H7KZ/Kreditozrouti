import { mysql, redis } from '@api/clients'
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
import FacetItem from '@api/Interfaces/FacetItem'
import DateService from '@api/Services/DateService'
import { TimeSelection } from '@api/Validations'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation'
import { InSISDayValues } from '@scraper/Types/InSISDay'
import { ExpressionBuilder, Nullable, SelectQueryBuilder, sql } from 'kysely'
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
	 * Retrieves courses associated with a specific study plan.
	 *
	 * @param studyPlanIds[] - ID of the study plan
	 * @returns Array of courses linked to the study plan
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
	 * Counts courses matching the given filters.
	 * Uses COUNT(DISTINCT) to handle potential duplicates from joins.
	 */
	private static async getFilteredCourseCount(filters: Partial<CoursesFilter>): Promise<number> {
		const query = this.buildFilterQuery(filters).select(eb => eb.fn.count<number>('c1.id').distinct().as('total'))

		const result = await query.executeTakeFirst()
		return result?.total ?? 0
	}

	/**
	 * Fetches only the IDs of courses for the current page.
	 * Keeps the initial query lightweight before loading full relations.
	 */
	private static async getPaginatedCourseIds(filters: Partial<CoursesFilter>, limit: number, offset: number): Promise<number[]> {
		const results = await this.buildFilterQuery(filters)
			.select('c1.id')
			.groupBy('c1.id')
			.orderBy(this.getSortColumn(filters.sort_by, 'c1') as any, filters.sort_dir ?? 'asc')
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
	private static async getFacultiesByIds(courseIds: number[]) {
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
	private static async getUnitsWithSlotsByIds(courseIds: number[]) {
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
	private static async getAssessmentsByIds(courseIds: number[]) {
		return mysql.selectFrom(`${CourseAssessmentTable._table} as ca1`).selectAll('ca1').where('ca1.course_id', 'in', courseIds).execute()
	}

	/**
	 * Fetches study plan course associations for given courses and plans.
	 * Only called when study_plan_ids filter is active.
	 */
	private static async getStudyPlanCoursesByIds(courseIds: number[], studyPlanIds: number[]) {
		return mysql
			.selectFrom(`${StudyPlanCourseTable._table} as spc1`)
			.selectAll('spc1')
			.where('spc1.course_id', 'in', courseIds)
			.where('spc1.study_plan_id', 'in', studyPlanIds)
			.execute()
	}

	/**
	 * Builds the base filter query with conditional joins.
	 * Only joins tables that are actually needed by the active filters.
	 *
	 * @param filters - Filter criteria
	 * @param ignore - Filter key to exclude (used for facet computation to avoid self-filtering)
	 * @param forceJoin - Force specific joins regardless of filters
	 * @returns Kysely query builder with applied joins and filters
	 */
	private static buildFilterQuery(
		filters: Partial<CoursesFilter>,
		ignore?: string,
		forceJoin: { units?: boolean; slots?: boolean; studyPlan?: boolean } = {}
	): QueryBuilder {
		const needsUnitsJoin = this.needsUnitsJoin(filters, ignore) || forceJoin.units
		const needsSlotsJoin = this.needsSlotsJoin(filters, ignore) || forceJoin.slots
		const needsStudyPlanJoin = this.needsStudyPlanJoin(filters, ignore) || forceJoin.studyPlan

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

		return this.applyFilters(query, filters, ignore)
	}

	/** Determines if units join is needed (for lecturer filters). */
	private static needsUnitsJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return !!filters.lecturers?.length && ignore !== 'lecturers'
	}

	/** Determines if slots join is needed (for time-based filters). */
	private static needsSlotsJoin(filters: Partial<CoursesFilter>, ignore?: string): boolean {
		return (!!filters.include_times?.length && ignore !== 'include_times') || (!!filters.exclude_times?.length && ignore !== 'exclude_times')
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
	 *
	 * @param query - Kysely query builder
	 * @param filters - Filter criteria
	 * @param ignore - Filter to skip (for facet computation)
	 */
	private static applyFilters(query: QueryBuilder, filters: Partial<CoursesFilter>, ignore?: string) {
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

		// Time filters (only if slots join exists)
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
					// Case 1: The course has NO units (Catalog-only entry) - keep these
					eb.not(eb.exists(eb.selectFrom(`${CourseUnitTable._table} as cu2`).select('cu2.id').whereRef('cu2.course_id', '=', 'c1.id'))),
					// Case 2: The course has at least one unit with at least one NON-conflicting slot
					// Key fix: INNER JOIN ensures the slot actually exists (not vacuous truth)
					// Then we check that the slot does NOT match ANY of the conflict conditions
					eb.exists(
						eb
							.selectFrom(`${CourseUnitTable._table} as cu3`)
							.innerJoin(`${CourseUnitSlotTable._table} as cus3`, 'cu3.id', 'cus3.unit_id')
							.select('cus3.id')
							.whereRef('cu3.course_id', '=', 'c1.id')
							.where(ebSlot => {
								// Build all conflict conditions for all exclusions
								const allConflictConditions = filters.exclude_times!.flatMap(exc => this.buildSlotConflictCondition(ebSlot, exc, 'cus3'))
								// This slot is "safe" if NONE of the conflict conditions match
								// i.e., NOT (condition1 OR condition2 OR ...)
								return allConflictConditions.length > 0 ? ebSlot.not(ebSlot.or(allConflictConditions)) : ebSlot.val(true) // No exclusions = all slots are safe
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

		// Course properties filters
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

		// SLOW PATH: Need full filter query (already handles ignore correctly via buildFilterQuery)
		return this.buildFilterQuery(filters, column as string)
			.select(`c1.${column} as value`)
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where(`c1.${column}`, 'is not', null)
			.groupBy(`c1.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Helper to build conflict conditions using Kysely ExpressionBuilder.
	 * Generates expressions for day/time or date/time overlaps.
	 *
	 * A slot "conflicts" with an exclusion if:
	 * - Same day AND times overlap (for day-based exclusions)
	 * - Same date AND times overlap (for date-based exclusions)
	 * - Day matches date's weekday AND times overlap (for date-based exclusions, catches weekly slots)
	 *
	 * If slot_id is provided, that specific slot is EXCLUDED from being considered a conflict
	 * (because it's the slot the user already selected for that course).
	 */
	private static buildSlotConflictCondition(eb: ExpressionBuilder<any, any>, exc: TimeSelection, slotAlias: string) {
		const conditions = []

		if (exc.day) {
			// Day-based exclusion: matches slots on the same weekday with overlapping time
			const dayConditions = [
				eb(`${slotAlias}.day`, '=', exc.day),
				eb(`${slotAlias}.time_from`, '<', exc.time_to),
				eb(`${slotAlias}.time_to`, '>', exc.time_from)
			]
			// If slot_id provided, exclude that specific slot from conflict detection
			if (exc.slot_id) {
				dayConditions.push(eb(`${slotAlias}.id`, '!=', exc.slot_id))
			}
			conditions.push(eb.and(dayConditions))
		}

		if (exc.date) {
			const dateStr = exc.date instanceof Date ? exc.date.toISOString().split('T')[0] : String(exc.date)

			// Date-based exclusion: matches slots on the exact same date with overlapping time
			const dateConditions = [
				eb(`${slotAlias}.date`, '=', dateStr),
				eb(`${slotAlias}.time_from`, '<', exc.time_to),
				eb(`${slotAlias}.time_to`, '>', exc.time_from)
			]
			if (exc.slot_id) {
				dateConditions.push(eb(`${slotAlias}.id`, '!=', exc.slot_id))
			}
			conditions.push(eb.and(dateConditions))

			// Also check day-based slots that fall on the same weekday
			// (e.g., if exclusion is for 2025-03-17 which is Monday, also catch weekly Monday slots)
			const dateDay = DateService.getDayFromDate(exc.date)
			if (dateDay) {
				const dateDayConditions = [
					eb(`${slotAlias}.day`, '=', dateDay),
					eb(`${slotAlias}.time_from`, '<', exc.time_to),
					eb(`${slotAlias}.time_to`, '>', exc.time_from)
				]
				if (exc.slot_id) {
					dateDayConditions.push(eb(`${slotAlias}.id`, '!=', exc.slot_id))
				}
				conditions.push(eb.and(dateDayConditions))
			}
		}

		return conditions
	}

	/** Checks if any filters require joins (units, slots, or study plans). */
	private static needsComplexQueryForFacet(filters: CoursesFilter): boolean {
		return !!(
			filters.include_times?.length ??
			filters.exclude_times?.length ??
			filters.lecturers?.length ??
			filters.study_plan_ids?.length ??
			filters.groups?.length ??
			filters.categories?.length
		)
	}

	/**
	 * Computes day-of-week facet from course unit slots.
	 * Always requires slots join.
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
	 * Used for time range slider in UI.
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
			completed_course_idents: filters.completed_course_idents?.sort()
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
	private static getSortColumn(sortBy?: string, slotAlias = 'c1'): string {
		const sortMap: Record<string, string> = {
			ident: `${slotAlias}.ident`,
			title: `${slotAlias}.title`,
			ects: `${slotAlias}.ects`,
			faculty: `${slotAlias}.faculty_id`,
			year: `${slotAlias}.year`,
			semester: `${slotAlias}.semester`
		}
		return sortMap[sortBy ?? 'ident'] ?? 'c.ident'
	}

	/** Sorts time selection objects by day, then start time, then end time. */
	private static sortTimeSelection(a: TimeSelection, b: TimeSelection): number {
		const aDay = a.day ?? DateService.getDayFromDate(a.date!)
		const bDay = b.day ?? DateService.getDayFromDate(b.date!)

		if (!aDay && !bDay) return 0
		if (!aDay) return -1
		if (!bDay) return 1

		const aDayIndex = InSISDayValues.indexOf(aDay)
		const bDayIndex = InSISDayValues.indexOf(bDay)

		if (aDayIndex !== bDayIndex) return aDayIndex - bDayIndex
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
