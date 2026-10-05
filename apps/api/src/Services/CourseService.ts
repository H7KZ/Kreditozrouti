import { CourseFacetService, CourseQueryService } from '@kreditozrouti/core/course-search'
import { mysql } from '@api/clients'
import { CoursesFilter } from '@api/Controllers/Courses/CoursesController'
import { Course } from '@api/Database/types'
import { CourseCacheService } from './Course/CourseCacheService'

/**
 * Course search for the web app and the partner API. The query logic lives in `@kreditozrouti/core/course-search`
 * (shared with the MCP server); this facade binds it to the API's MySQL client and adds the Redis facet cache,
 * which core cannot own because it must not import Redis.
 */
export default class CourseService {
	static getCoursesWithRelations(filters: Partial<CoursesFilter>, limit = 20, offset = 0) {
		return CourseQueryService.getCoursesWithRelations(mysql, filters, limit, offset)
	}

	static getCoursesByStudyPlan(studyPlanIds: number[]): Promise<Course[]> {
		return CourseQueryService.getCoursesByStudyPlan(mysql, studyPlanIds)
	}

	/** Facets for the given filters, read from the Redis cache on a hit and written on a miss (5 minutes). */
	static async getCourseFacets(filters: CoursesFilter) {
		const cacheKey = CourseCacheService.buildFacetCacheKey(filters)

		const cached = await CourseCacheService.readFacetsFromCache(cacheKey)
		if (cached) return cached

		const facets = await CourseFacetService.computeAllFacets(mysql, filters)

		await CourseCacheService.writeFacetsToCache(cacheKey, facets)

		return facets
	}
}
