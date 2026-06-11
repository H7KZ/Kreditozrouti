import { redis } from '@api/clients'
import { StudyPlansFilter } from '@api/Controllers/Kreditozrouti/StudyPlansController'
import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'

const FACET_CACHE_TTL = 300
const FACET_CACHE_PREFIX = 'studyplan:facets:'

export class StudyPlanCacheService {
	/**
	 * Builds a stable Redis cache key from the given filters by sorting all array values
	 * before base64-encoding the JSON representation.
	 *
	 * @param {StudyPlansFilter} filters - The full filter object to hash into a cache key.
	 * @returns {string} Redis key scoped to `studyplan:facets:`.
	 */
	public static buildFacetCacheKey(filters: StudyPlansFilter): string {
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

	/**
	 * Attempts to read the facets payload from Redis. Returns null on cache miss or any error.
	 * Cache reads are best-effort — errors are swallowed.
	 *
	 * @param {string} key - Redis cache key produced by {@link buildFacetCacheKey}.
	 * @returns {Promise<StudyPlansResponse['facets'] | null>} Parsed facets object, or null on miss/error.
	 */
	public static async readFacetsFromCache(key: string): Promise<StudyPlansResponse['facets'] | null> {
		try {
			const cached = await redis.get(key)
			return cached ? (JSON.parse(cached) as StudyPlansResponse['facets']) : null
		} catch {
			return null
		}
	}

	/**
	 * Writes the computed facets payload to Redis with the configured TTL.
	 * Errors are swallowed — cache writes are best-effort.
	 *
	 * @param {string} key - Redis cache key produced by {@link buildFacetCacheKey}.
	 * @param {StudyPlansResponse['facets']} facets - The computed facets payload to store.
	 * @returns {Promise<void>}
	 */
	public static async writeFacetsToCache(key: string, facets: StudyPlansResponse['facets']): Promise<void> {
		try {
			await redis.setex(key, FACET_CACHE_TTL, JSON.stringify(facets))
		} catch {
			// Silently fail — cache is best-effort
		}
	}
}
