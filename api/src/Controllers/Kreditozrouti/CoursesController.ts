import { redis } from '@api/clients'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import CourseService from '@api/Services/CourseService'
import CoursesFilterValidation from '@api/Validations/CoursesFilterValidation'
import { Request, Response } from 'express'

/**
 * Retrieves a paginated list of courses with full relations based on complex filtering criteria.
 *
 * Returns courses with:
 * - Faculty information
 * - Timetable units and slots
 * - Assessment methods
 * - Study plan associations (when filtering by study_plan_id)
 *
 * Results are cached in Redis for 5 minutes.
 *
 * @param req - Express request object containing the filter payload.
 * @param res - Express response object.
 * @throws {Exception} 400 - If the validation of the search request fails.
 */
export default async function CoursesController(req: Request, res: Response<CoursesResponse>) {
	LoggerAPIContext.add(res, { body: req.body })

	const result = await CoursesFilterValidation.safeParseAsync(req.body)

	if (!result.success) {
		throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
	}

	const filter = result.data

	// Build cache key from filter
	const cacheKey = `insis:courses:v2:${JSON.stringify(filter)}`
	const cachedData = await redis.get(cacheKey)

	if (cachedData) {
		LoggerAPIContext.add(res, { cache: true })
		return res.status(200).send(JSON.parse(cachedData))
	}

	// Fetch data with relations
	const [{ courses, total }, facets] = await Promise.all([
		CourseService.getCoursesWithRelations(filter, filter.limit, filter.offset),
		CourseService.getCourseFacets(filter)
	])

	LoggerAPIContext.add(res, {
		cache: false,
		courses_count: courses.length,
		total_count: total,
		facets_count: Object.keys(facets).length
	})

	const response: CoursesResponse = {
		data: courses,
		facets,
		meta: {
			limit: filter.limit ?? 20,
			offset: filter.offset ?? 0,
			count: courses.length,
			total
		}
	}

	// Cache for 5 minutes
	await redis.setex(cacheKey, 300, JSON.stringify(response))

	return res.status(200).send(response)
}
