import type { FacetItem } from '@shared/http/facets'
import { sql } from 'kysely'
import { mysql } from '@api/clients'
import { CoursesFilter } from '@api/Controllers/Kreditozrouti/CoursesController'
import { Course, CourseTable, ExcludeMethods } from '@api/Database/types'
import { CourseCacheService } from './CourseCacheService'
import { CourseFilterBuilder } from './CourseFilterBuilder'

export class CourseFacetService {
	/**
	 * Returns the facet object for the given filters, reading from Redis cache on hit
	 * and writing on miss. Results are cached in Redis for 5 minutes.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns All facet dimensions. Results are cached in Redis for 5 minutes.
	 */
	static async getCourseFacets(filters: CoursesFilter) {
		const cacheKey = CourseCacheService.buildFacetCacheKey(filters)

		const cached = await CourseCacheService.readFacetsFromCache(cacheKey)
		if (cached) return cached

		const facets = await this.computeAllFacets(filters)

		await CourseCacheService.writeFacetsToCache(cacheKey, facets)

		return facets
	}

	/**
	 * Fires all facet dimension queries concurrently and returns the combined result.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns Object with all facet dimensions computed in parallel.
	 */
	static async computeAllFacets(filters: CoursesFilter) {
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
	 * Computes a single facet dimension for a given Course table column.
	 * Uses a direct-table fast path when no joins are required; falls back to the full filtered
	 * query with joins otherwise.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @param {keyof ExcludeMethods<Course>} column - A Course table column to facet on.
	 * @returns {Promise<FacetItem[]>} `{ value, count }[]` sorted by count desc. Uses direct-table
	 *   fast path when no joins are required.
	 */
	static async getSimpleFacet(filters: CoursesFilter, column: keyof ExcludeMethods<Course>): Promise<FacetItem[]> {
		const needsComplexQuery = CourseFilterBuilder.filtersRequireJoins(filters)

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
		return CourseFilterBuilder.buildFilterQuery(filters, column as string)
			.select(`c1.${column} as value`)
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where(`c1.${column}`, 'is not', null)
			.groupBy(`c1.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Returns day values from course_unit_slots. Always forces the slots join.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns {Promise<FacetItem[]>} Day values from course_unit_slots; always forces slots join.
	 */
	// Always requires the slots join
	static async getDayFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		return CourseFilterBuilder.buildFilterQuery(filters, 'include_times', { slots: true })
			.select('cus1.day as value')
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where('cus1.day', 'is not', null)
			.groupBy('cus1.day')
			.orderBy('value')
			.execute()
	}

	/**
	 * Returns COALESCE(unit.lecturer, course.lecturers) aggregated, limited to top 50.
	 * Always forces the units join.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns COALESCE(unit.lecturer, course.lecturers) aggregated, limited to top 50.
	 *   Always forces units join.
	 */
	// Uses COALESCE to prefer unit-level lecturer when available
	static async getLecturerFacet(filters: CoursesFilter) {
		return CourseFilterBuilder.buildFilterQuery(filters, 'lecturers', { units: true })
			.select(sql<string>`COALESCE(cu1.lecturer, c1.lecturers)`.as('value'))
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where(sql`COALESCE(cu1.lecturer, c1.lecturers)`, 'is not', null)
			.groupBy(sql`COALESCE(cu1.lecturer, c1.lecturers)`)
			.orderBy('count', 'desc')
			.limit(50)
			.execute()
	}

	/**
	 * Returns pipe-delimited language strings from courses. Split into individual entries in
	 * post-processing via splitPipeDelimitedFacet.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns Pipe-delimited language strings from courses; split in post-processing via
	 *   splitPipeDelimitedFacet.
	 */
	// Pipe-delimited values handled in post-processing via splitPipeDelimitedFacet
	static async getLanguageFacet(filters: CoursesFilter) {
		return CourseFilterBuilder.buildFilterQuery(filters, 'languages')
			.select('c1.languages as value')
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where('c1.languages', 'is not', null)
			.groupBy('c1.languages')
			.orderBy('count', 'desc')
			.execute()
	}

	/**
	 * Returns group values from study_plan_course rows.
	 * Returns empty array when no study_plan_ids filter is active.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns {Promise<FacetItem[]>} Empty array when no study_plan_ids filter is active.
	 */
	// Only available when filtering by study_plan_ids
	static async getGroupFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_ids) return []
		return CourseFilterBuilder.buildFilterQuery(filters, 'groups', { studyPlan: true })
			.select('spc1.group as value')
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where('spc1.group', 'is not', null)
			.groupBy('spc1.group')
			.orderBy('value')
			.execute()
	}

	/**
	 * Returns category values from study_plan_course rows.
	 * Returns empty array when no study_plan_ids filter is active.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns {Promise<FacetItem[]>} Empty array when no study_plan_ids filter is active.
	 */
	// Only available when filtering by study_plan_ids
	static async getCategoryFacet(filters: CoursesFilter): Promise<FacetItem[]> {
		if (!filters.study_plan_ids) return []
		return CourseFilterBuilder.buildFilterQuery(filters, 'categories', { studyPlan: true })
			.select('spc1.category as value')
			.select(eb => eb.fn.count<number>('c1.id').distinct().as('count'))
			.where('spc1.category', 'is not', null)
			.groupBy('spc1.category')
			.orderBy('value')
			.execute()
	}

	/**
	 * Returns the min and max time values across all course unit slots matching the filters.
	 * Defaults to `{ min_time: 0, max_time: 1440 }` when no slots exist.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns `{ min_time, max_time }` in minutes from midnight; defaults to `{ 0, 1440 }` when
	 *   no slots exist.
	 */
	// Returns min/max time in minutes from midnight; used for the time range slider
	static async getTimeRangeFacet(filters: CoursesFilter) {
		const result = await CourseFilterBuilder.buildFilterQuery(filters, 'include_times', { slots: true })
			.select(eb => [eb.fn.min<number>('cus1.time_from').as('min_time'), eb.fn.max<number>('cus1.time_to').as('max_time')])
			.where('cus1.time_from', 'is not', null)
			.executeTakeFirst()

		return {
			min_time: result?.min_time ?? 0,
			max_time: result?.max_time ?? 1440
		}
	}

	/**
	 * Splits pipe-delimited facet values (e.g. "EN|CS") into individual entries, aggregates their
	 * counts, deduplicates, sorts by count descending, and optionally limits the result.
	 *
	 * @param {{ value: string | null; count: number }[]} data - Raw facet rows with pipe-delimited
	 *   value strings.
	 * @param {number} [limit] - Optional max entries to return after sorting.
	 * @returns {FacetItem[]} Deduplicated and aggregated FacetItem[].
	 */
	// Splits pipe-delimited facet values (e.g. "EN|CS") into individual entries and aggregates counts
	static splitPipeDelimitedFacet(data: { value: string | null; count: number }[], limit?: number): FacetItem[] {
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
}
