import { redis } from '@api/clients'
import { CoursesFilter } from '@api/Controllers/Kreditozrouti/CoursesController'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import { compareTimeSelections } from '@api/utils/timeConflict'

const FACET_CACHE_TTL = 300
const FACET_CACHE_PREFIX = 'course:facets:'

export class CourseCacheService {
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

	public static async readFacetsFromCache(key: string): Promise<CoursesResponse['facets'] | null> {
		try {
			const cached = await redis.get(key)
			return cached ? (JSON.parse(cached) as CoursesResponse['facets']) : null
		} catch {
			return null
		}
	}

	public static async writeFacetsToCache(key: string, facets: CoursesResponse['facets']): Promise<void> {
		try {
			await redis.setex(key, FACET_CACHE_TTL, JSON.stringify(facets))
		} catch {
			// Silently fail cache write
		}
	}
}
