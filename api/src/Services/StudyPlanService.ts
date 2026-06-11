import type { FacetItem } from '@shared/http/facets'
import { Nullable, SelectQueryBuilder, sql } from 'kysely'
import { mysql, redis } from '@api/clients'
import { StudyPlansFilter } from '@api/Controllers/Kreditozrouti/StudyPlansController'
import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import { Database, ExcludeMethods, Faculty, FacultyTable, StudyPlan, StudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'

// Constants

// Cache TTL for facet queries (5 minutes)
const FACET_CACHE_TTL = 300
const FACET_CACHE_PREFIX = 'studyplan:facets:'

// Internal Types

type QueryBuilder = SelectQueryBuilder<Database & { sp: StudyPlanTable } & { spc: Nullable<StudyPlanCourseTable> }, 'sp' | 'spc', object>

export default class StudyPlanService {
	// Public API

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
			faculty: plan.faculty_id ? (facultyMap.get(plan.faculty_id) ?? null) : null,
			courses: coursesMap.get(plan.id) ?? []
		}))

		return { plans: enrichedPlans, total }
	}

	static async getStudyPlanFacets(filters: StudyPlansFilter) {
		const cacheKey = this.buildFacetCacheKey(filters)

		const cached = await this.readFacetsFromCache(cacheKey)
		if (cached) return cached

		const facets = await this.computeAllFacetsInParallel(filters)
		await this.writeFacetsToCache(cacheKey, facets)

		return facets
	}

	// Querying

	private static async getFilteredPlanCount(filters: Partial<StudyPlansFilter>): Promise<number> {
		const query = this.buildFilterQuery(filters).select(eb => eb.fn.count<number>('sp.id').distinct().as('total'))

		const result = await query.executeTakeFirst()
		return result?.total ?? 0
	}

	private static async getPaginatedPlanIds(filters: Partial<StudyPlansFilter>, limit: number, offset: number): Promise<number[]> {
		const results = await this.buildFilterQuery(filters)
			.select('sp.id')
			.groupBy('sp.id')
			.orderBy(this.getStudyPlanSortColumn(filters.sort_by), filters.sort_dir ?? 'asc')
			.limit(limit)
			.offset(offset)
			.execute()

		return results.map(r => r.id)
	}

	private static getPlansByIds(ids: number[]) {
		return mysql
			.selectFrom(`${StudyPlanTable._table} as sp`)
			.selectAll('sp')
			.where('sp.id', 'in', ids)
			.orderBy(sql`FIELD(sp.id, ${sql.join(ids)})`)
			.execute()
	}

	private static getFacultiesForPlanIds(planIds: number[]) {
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

	private static getCoursesForPlanIds(planIds: number[]) {
		return mysql.selectFrom(`${StudyPlanCourseTable._table} as spc`).selectAll('spc').where('spc.study_plan_id', 'in', planIds).execute()
	}

	// Filtering

	private static buildFilterQuery(filters: Partial<StudyPlansFilter>, ignoreFacet?: string) {
		const needsCoursesJoin = this.needsCoursesJoin(filters, ignoreFacet)

		let query: QueryBuilder = mysql.selectFrom(`${StudyPlanTable._table} as sp`) as QueryBuilder

		if (needsCoursesJoin) {
			query = query.leftJoin(`${StudyPlanCourseTable._table} as spc`, 'sp.id', 'spc.study_plan_id')
		}

		return this.applyFilters(query, filters, ignoreFacet)
	}

	private static needsCoursesJoin(filters: Partial<StudyPlansFilter>, ignore?: string): boolean {
		return (!!filters.has_course_ids?.length && ignore !== 'has_course_ids') || (!!filters.has_course_idents?.length && ignore !== 'has_course_idents')
	}

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

	// Facets

	private static async computeAllFacetsInParallel(filters: StudyPlansFilter) {
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

	private static async getSimpleFacet(filters: StudyPlansFilter, column: keyof ExcludeMethods<StudyPlan>): Promise<FacetItem[]> {
		const needsComplexQuery = !!(filters.has_course_ids?.length || filters.has_course_idents?.length)

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

	// Cache

	private static buildFacetCacheKey(filters: StudyPlansFilter): string {
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

	private static async readFacetsFromCache(key: string): Promise<StudyPlansResponse['facets'] | null> {
		try {
			const cached = await redis.get(key)
			return cached ? (JSON.parse(cached) as StudyPlansResponse['facets']) : null
		} catch {
			return null
		}
	}

	private static async writeFacetsToCache(key: string, facets: unknown): Promise<void> {
		try {
			await redis.setex(key, FACET_CACHE_TTL, JSON.stringify(facets))
		} catch {
			// Silently fail — cache is best-effort
		}
	}

	// Utilities

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
