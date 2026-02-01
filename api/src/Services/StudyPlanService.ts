import { mysql, redis } from '@api/clients'
import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import { Database, ExcludeMethods, Faculty, FacultyTable, StudyPlan, StudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem'
import { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation'
import { Nullable, SelectQueryBuilder, sql } from 'kysely'

/** Cache TTL for facet queries (5 minutes) */
const FACET_CACHE_TTL = 300
const FACET_CACHE_PREFIX = 'studyplan:facets:'

type QueryBuilder = SelectQueryBuilder<Database & { sp: StudyPlanTable } & { spc: Nullable<StudyPlanCourseTable> }, 'sp' | 'spc', object>

/**
 * Service for StudyPlan-related database operations.
 *
 * Uses an optimized query pattern to avoid N+1 problems:
 * 1. Count filtered results
 * 2. Fetch paginated IDs
 * 3. Load relations in parallel
 * 4. Merge in-memory
 */
export default class StudyPlanService {
	/**
	 * Retrieves paginated study plans with full relational data (faculty, courses).
	 *
	 * @param filters - Filter criteria for study plans
	 * @param limit - Maximum number of results (default: 20)
	 * @param offset - Number of results to skip for pagination
	 * @returns Object containing enriched plans and total count
	 *
	 * @example
	 * ```ts
	 * const { plans, total } = await StudyPlanService.getStudyPlansWithRelations(
	 *   { faculty_ids: [1, 2], years: [2024] },
	 *   10,
	 *   0
	 * )
	 * ```
	 */
	static async getStudyPlansWithRelations(
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
			faculty: facultyMap.get(plan.faculty_id!) ?? null,
			courses: coursesMap.get(plan.id) ?? []
		}))

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		return { plans: enrichedPlans as any, total }
	}

	/**
	 * Counts study plans matching the given filters.
	 * Uses COUNT(DISTINCT) to handle potential duplicates from joins.
	 */
	private static async getFilteredPlanCount(filters: Partial<StudyPlansFilter>): Promise<number> {
		const query = this.buildFilterQuery(filters).select(eb => eb.fn.count<number>('sp.id').distinct().as('total'))

		const result = await query.executeTakeFirst()
		return result?.total ?? 0
	}

	/**
	 * Fetches only the IDs of study plans for the current page.
	 * Keeps the initial query lightweight before loading full relations.
	 */
	private static async getPaginatedPlanIds(filters: Partial<StudyPlansFilter>, limit: number, offset: number): Promise<number[]> {
		const results = await this.buildFilterQuery(filters)
			.select('sp.id')
			.groupBy('sp.id')
			.orderBy(this.getStudyPlanSortColumn(filters.sort_by) as any, filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)
			.execute()

		return results.map(r => r.id)
	}

	/**
	 * Fetches full study plan records by IDs, preserving the original order.
	 * Uses MySQL's FIELD() function to maintain pagination order.
	 */
	private static async getPlansByIds(ids: number[]) {
		return mysql
			.selectFrom(`${StudyPlanTable._table} as sp`)
			.selectAll('sp')
			.where('sp.id', 'in', ids)
			.orderBy(sql`FIELD(sp.id, ${sql.join(ids)})`)
			.execute()
	}

	/**
	 * Fetches faculties associated with the given plan IDs.
	 * Uses a subquery to avoid loading unnecessary faculty records.
	 */
	private static async getFacultiesForPlanIds(planIds: number[]) {
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

	/** Fetches all courses belonging to the given study plan IDs. */
	private static async getCoursesForPlanIds(planIds: number[]) {
		return mysql.selectFrom(`${StudyPlanCourseTable._table} as spc`).selectAll('spc').where('spc.study_plan_id', 'in', planIds).execute()
	}

	/**
	 * Builds the base filter query with conditional joins.
	 *
	 * @param filters - Filter criteria
	 * @param ignoreFacet - Facet column to exclude (used when computing facets to avoid self-filtering)
	 */
	private static buildFilterQuery(filters: Partial<StudyPlansFilter>, ignoreFacet?: string) {
		const needsCoursesJoin = this.needsCoursesJoin(filters, ignoreFacet)

		let query: QueryBuilder = mysql.selectFrom(`${StudyPlanTable._table} as sp`) as QueryBuilder

		if (needsCoursesJoin) {
			query = query.leftJoin(`${StudyPlanCourseTable._table} as spc`, 'sp.id', 'spc.study_plan_id')
		}

		return this.applyFilters(query as any, filters, ignoreFacet)
	}

	/** Determines if the courses join is required based on active filters. */
	private static needsCoursesJoin(filters: Partial<StudyPlansFilter>, ignore?: string): boolean {
		return (!!filters.has_course_ids?.length && ignore !== 'has_course_ids') || (!!filters.has_course_idents?.length && ignore !== 'has_course_idents')
	}

	/**
	 * Applies all filter conditions to the query builder.
	 *
	 * @param query - Kysely query builder
	 * @param filters - Filter criteria
	 * @param ignoreFacet - Filter to skip (for facet computation)
	 */
	private static applyFilters(query: QueryBuilder, filters: Partial<StudyPlansFilter>, ignoreFacet?: string) {
		// Identity filters
		if (filters.ids?.length && ignoreFacet !== 'ids') {
			query = query.where('sp.id', 'in', filters.ids)
		}

		if (filters.idents?.length && ignoreFacet !== 'idents') {
			query = query.where(eb => eb.or(filters.idents!.map((v: string) => eb('sp.ident', 'like', `%${v}%`))))
		}

		if (filters.title && ignoreFacet !== 'title') {
			query = query.where('sp.title', 'like', `%${filters.title}%`)
		}

		// Faculty & Period
		if (filters.faculty_ids?.length && ignoreFacet !== 'faculty_ids') {
			query = query.where('sp.faculty_id', 'in', filters.faculty_ids)
		}

		if (filters.years?.length && ignoreFacet !== 'years') {
			query = query.where('sp.year', 'in', filters.years)
		}

		if (filters.semesters?.length && ignoreFacet !== 'semesters') {
			query = query.where('sp.semester', 'in', filters.semesters)
		}

		if (filters.levels?.length && ignoreFacet !== 'levels') {
			query = query.where('sp.level', 'in', filters.levels)
		}

		if (filters.mode_of_studies?.length && ignoreFacet !== 'mode_of_studies') {
			query = query.where('sp.mode_of_study', 'in', filters.mode_of_studies)
		}

		if (filters.study_lengths?.length && ignoreFacet !== 'study_lengths') {
			query = query.where('sp.study_length', 'in', filters.study_lengths)
		}

		// Course-related filters
		if (filters.has_course_ids?.length && ignoreFacet !== 'has_course_ids') {
			query = query.where('spc.course_id', 'in', filters.has_course_ids)
		}

		if (filters.has_course_idents?.length && ignoreFacet !== 'has_course_idents') {
			query = query.where('spc.course_ident', 'in', filters.has_course_idents)
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
	static async getStudyPlanFacets(filters: StudyPlansFilter) {
		const cacheKey = this.getFacetCacheKey(filters)

		const cached = await this.getCachedFacets(cacheKey)
		if (cached) return cached

		const facets = await this.computeFacets(filters)
		await this.cacheFacets(cacheKey, facets)

		return facets
	}

	/** Computes all facets in parallel for maximum efficiency. */
	private static async computeFacets(filters: StudyPlansFilter) {
		const [faculties, levels, modesOfStudies, semesters, years, studyLengths] = await Promise.all([
			this.getSimpleFacet(filters, 'faculty_id'),
			this.getSimpleFacet(filters, 'level'),
			this.getSimpleFacet(filters, 'mode_of_study'),
			this.getSimpleFacet(filters, 'semester'),
			this.getSimpleFacet(filters, 'year'),
			this.getSimpleFacet(filters, 'study_length')
		])

		return {
			faculties,
			levels,
			modes_of_studies: modesOfStudies,
			semesters,
			years,
			study_lengths: studyLengths
		}
	}

	/**
	 * Computes facet counts for a single column.
	 *
	 * Uses a fast path (direct table query) when no course-related filters are active,
	 * falling back to the full join query when necessary.
	 *
	 * Cross-filtering: applies all filters EXCEPT the one being computed,
	 * so users see available options given their other active selections.
	 *
	 * @param filters - Current filter state
	 * @param column - Column to compute facet for
	 */
	private static async getSimpleFacet(filters: StudyPlansFilter, column: keyof ExcludeMethods<StudyPlan>): Promise<FacetItem[]> {
		const needsComplexQuery = !!(filters.has_course_ids?.length ?? filters.has_course_idents?.length)

		if (!needsComplexQuery) {
			// FAST PATH: Direct query on study_plans table only
			// Apply all filters EXCEPT the one we're computing (cross-filtering)
			return mysql
				.selectFrom(`${StudyPlanTable._table} as sp`)
				.select(`sp.${column} as value`)
				.select(eb => eb.fn.count<number>('sp.id').as('count'))
				.where(`sp.${column}`, 'is not', null)
				.$if(!!filters.ids?.length && column !== 'id', q => q.where('sp.id', 'in', filters.ids!))
				.$if(!!filters.idents?.length && column !== 'ident', q =>
					q.where(eb => eb.or(filters.idents!.map((v: string) => eb('sp.ident', 'like', `%${v}%`))))
				)
				.$if(!!filters.title, q => q.where('sp.title', 'like', `%${filters.title}%`))
				.$if(!!filters.faculty_ids?.length && column !== 'faculty_id', q => q.where('sp.faculty_id', 'in', filters.faculty_ids!))
				.$if(!!filters.semesters?.length && column !== 'semester', q => q.where('sp.semester', 'in', filters.semesters!))
				.$if(!!filters.years?.length && column !== 'year', q => q.where('sp.year', 'in', filters.years!))
				.$if(!!filters.levels?.length && column !== 'level', q => q.where('sp.level', 'in', filters.levels!))
				.$if(!!filters.mode_of_studies?.length && column !== 'mode_of_study', q => q.where('sp.mode_of_study', 'in', filters.mode_of_studies!))
				.$if(!!filters.study_lengths?.length && column !== 'study_length', q => q.where('sp.study_length', 'in', filters.study_lengths!))
				.groupBy(`sp.${column}`)
				.orderBy('count', 'desc')
				.execute()
		}

		// SLOW PATH: Need full filter query with joins (already handles ignoreFacet correctly)
		return this.buildFilterQuery(filters, column as string)
			.select(`sp.${column} as value`)
			.select(eb => eb.fn.count<number>('sp.id').distinct().as('count'))
			.where(`sp.${column}`, 'is not', null)
			.groupBy(`sp.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Generates a deterministic cache key from relevant filter values.
	 * Only includes filters that affect facet counts.
	 */
	private static getFacetCacheKey(filters: StudyPlansFilter): string {
		const relevantFilters = {
			faculty_ids: filters.faculty_ids?.sort(),
			semesters: filters.semesters?.sort(),
			years: filters.years?.sort(),
			levels: filters.levels?.sort(),
			mode_of_studies: filters.mode_of_studies?.sort(),
			study_lengths: filters.study_lengths?.sort(),
			has_course_ids: filters.has_course_ids?.sort(),
			has_course_idents: filters.has_course_idents?.sort()
		}

		const hash = Buffer.from(JSON.stringify(relevantFilters)).toString('base64')
		return `${FACET_CACHE_PREFIX}${hash}`
	}

	private static async getCachedFacets(key: string): Promise<StudyPlansResponse['facets'] | null> {
		try {
			const cached = await redis.get(key)
			return cached ? (JSON.parse(cached) as StudyPlansResponse['facets']) : null
		} catch {
			return null
		}
	}

	private static async cacheFacets(key: string, facets: any): Promise<void> {
		try {
			await redis.setex(key, FACET_CACHE_TTL, JSON.stringify(facets))
		} catch {
			// Silently fail
		}
	}

	// /**
	//  * Invalidates all cached facet data.
	//  * Call this after study plan data changes (create/update/delete).
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

	/** Maps sort_by parameter to actual database column. */
	private static getStudyPlanSortColumn(sortBy?: string): string {
		const sortMap: Record<string, string> = {
			ident: 'sp.ident',
			title: 'sp.title',
			faculty_id: 'sp.faculty_id',
			year: 'sp.year',
			semester: 'sp.semester',
			level: 'sp.level'
		}
		return sortMap[sortBy ?? 'ident'] ?? 'sp.ident'
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
