import type { CoursesFilter } from '@shared/http/courses'
import type { CoursesResponseDTO } from '@shared/http/responses'
import { redis } from '@api/clients'
import { compareTimeSelections } from '@api/Utils/TimeConflict'

const FACET_CACHE_TTL = 300
const FACET_CACHE_PREFIX = 'course:facets:'

export class CourseCacheService {
	/**
	 * Builds a deterministic Redis cache key for the given course filter set.
	 * Arrays are sorted before hashing to ensure cache-key stability regardless of input ordering.
	 *
	 * @param {CoursesFilter} filters - The full filter object for the current request.
	 * @returns {string} Base64-encoded Redis key prefixed with `course:facets:`.
	 */
	public static buildFacetCacheKey(filters: CoursesFilter): string {
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

	/**
	 * Reads parsed facets from the Redis cache. Errors are swallowed (cache is best-effort).
	 *
	 * @param {string} key - Redis cache key.
	 * @returns {Promise<CoursesResponseDTO['facets'] | null>} Parsed facets or null on miss or error.
	 */
	public static async readFacetsFromCache(key: string): Promise<CoursesResponseDTO['facets'] | null> {
		try {
			const cached = await redis.get(key)
			return cached ? (JSON.parse(cached) as CoursesResponseDTO['facets']) : null
		} catch {
			return null
		}
	}

	/**
	 * Writes computed facets to the Redis cache with a 300-second TTL. Errors are swallowed
	 * (cache is best-effort).
	 *
	 * @param {string} key - Redis cache key.
	 * @param {CoursesResponseDTO['facets']} facets - Computed facets payload to cache.
	 */
	public static async writeFacetsToCache(key: string, facets: CoursesResponseDTO['facets']): Promise<void> {
		try {
			await redis.setex(key, FACET_CACHE_TTL, JSON.stringify(facets))
		} catch {
			// Silently fail cache write
		}
	}
}
