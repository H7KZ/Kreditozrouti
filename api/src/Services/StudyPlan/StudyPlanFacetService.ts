import type { FacetItem } from '@shared/http/facets'
import { mysql } from '@api/clients'
import { StudyPlansFilter } from '@api/Controllers/Kreditozrouti/StudyPlansController'
import { ExcludeMethods, StudyPlan, StudyPlanTable } from '@api/Database/types'
import { StudyPlanCacheService } from './StudyPlanCacheService'
import { StudyPlanFilterBuilder } from './StudyPlanFilterBuilder'

export class StudyPlanFacetService {
	/**
	 * Returns the facet object for the given filters, reading from Redis cache on hit
	 * and writing on miss. Facets are computed cross-filtered (each facet dimension
	 * excludes its own filter when computing counts).
	 *
	 * @param {StudyPlansFilter} filters - The full filter object for the current request.
	 * @returns Facet object (see StudyPlansResponse['facets']). Reads from Redis cache; writes on miss.
	 */
	public static async getStudyPlanFacets(filters: StudyPlansFilter) {
		const cacheKey = StudyPlanCacheService.buildFacetCacheKey(filters)

		const cached = await StudyPlanCacheService.readFacetsFromCache(cacheKey)
		if (cached) return cached

		const facets = await this.computeAllFacetsInParallel(filters)
		await StudyPlanCacheService.writeFacetsToCache(cacheKey, facets)

		return facets
	}

	/**
	 * Fires all six facet dimension queries concurrently and returns the combined result.
	 *
	 * @param {StudyPlansFilter} filters - The full filter object for the current request.
	 * @returns All six facet dimensions (faculties, levels, modes_of_studies, semesters, years,
	 *   study_lengths) computed in parallel.
	 */
	public static async computeAllFacetsInParallel(filters: StudyPlansFilter) {
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
	 * Computes a single facet dimension for a given StudyPlan column.
	 * Uses a fast direct-table path when no course join is needed; falls back to the full
	 * filtered query with join otherwise.
	 *
	 * @param {StudyPlansFilter} filters - The full filter object for the current request.
	 * @param {keyof ExcludeMethods<StudyPlan>} column - The StudyPlan table column to facet on.
	 * @returns {Promise<FacetItem[]>} Array of `{ value, count }` FacetItem entries sorted by count desc.
	 *   Uses fast direct-table path when no course join is needed; falls back to full filtered query
	 *   with join otherwise.
	 */
	public static async getSimpleFacet(filters: StudyPlansFilter, column: keyof ExcludeMethods<StudyPlan>): Promise<FacetItem[]> {
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
		return StudyPlanFilterBuilder.buildFilterQuery(filters, column as string)
			.select(`sp.${column} as value`)
			.select(eb => eb.fn.count<number>('sp.id').distinct().as('count'))
			.where(`sp.${column}`, 'is not', null)
			.groupBy(`sp.${column}`)
			.orderBy('count', 'desc')
			.execute()
	}
}
