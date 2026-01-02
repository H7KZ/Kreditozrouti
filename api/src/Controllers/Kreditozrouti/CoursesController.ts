import { redis } from '@api/clients'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import InSISService from '@api/Services/InSISService'
import CoursesFilterValidation from '@api/Validations/CoursesFilterValidation'
import { Request, Response } from 'express'

/**
 * Retrieves a paginated list of courses based on complex filtering criteria.
 *
 * This controller caches results in Redis for 5 minutes to optimize repeated queries.
 * It returns both the course data and aggregated facets for frontend filtering.
 *
 * @param req - Express request object containing the filter payload.
 * @param res - Express response object.
 * @throws {Exception} 401 - If the validation of the search request fails.
 */
export default async function CoursesController(req: Request, res: Response<CoursesResponse>) {
    const result = await CoursesFilterValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
    }

    const data = result.data

    // Check Cache
    const cacheKey = `insis:courses:${JSON.stringify(data)}`
    const cachedData = await redis.get(cacheKey)

    if (cachedData) {
        return res.status(200).send(JSON.parse(cachedData))
    }

    // Fetch Data
    const [courses, facets] = await Promise.all([InSISService.getCourses(data, data.limit, data.offset), InSISService.getFacets(data)])

    const response: CoursesResponse = {
        data: courses,
        facets: facets,
        meta: {
            limit: data.limit || 20,
            offset: data.offset || 0,
            count: courses.length
        }
    }

    await redis.setex(cacheKey, 300, JSON.stringify(response))

    return res.status(200).send(response)
}
