import { redis } from '@api/clients'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import InSISService from '@api/Services/InSISService'
import CoursesFilterValidation from '@api/Validations/CoursesFilterValidation'
import { Request, Response } from 'express'

/**
 * HTTP Controller for searching and filtering courses.
 * @remarks
 * This controller implements a "Faceted Search" pattern. It retrieves both the
 * course records matching the criteria and the available filter options (facets)
 * for the current search context.
 *
 * Performance optimizations:
 * - Input validation using Zod.
 * - **Response Caching**: Successful responses are cached in Redis for 5 minutes (300s)
 * to reduce load on the InSIS database for repeated queries.
 * - **Parallel Execution**: Fetches course data and facets concurrently.
 *
 * @param req - Express Request object containing query parameters.
 * @param res - Express Response object typed with `CoursesResponse`.
 * @throws {Exception} 401 - If the query parameters fail Zod validation.
 */
export default async function CoursesController(req: Request, res: Response<CoursesResponse>) {
    const result = await CoursesFilterValidation.safeParseAsync(req.query)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
    }

    const data = result.data

    const cacheKey = `courses:${JSON.stringify(data)}`
    const cachedData = await redis.get(`insis:courses:${cacheKey}`)

    if (cachedData) {
        return res.status(200).send(JSON.parse(cachedData))
    }

    const [courses, facets] = await Promise.all([InSISService.getCourses(data, data.limit, data.offset), InSISService.getFacets(data)])

    const response = {
        data: courses,
        facets: facets,
        meta: {
            limit: data.limit || 20,
            offset: data.offset || 0,
            count: courses.length
        }
    }

    await redis.setex(`insis:courses:${cacheKey}`, 300, JSON.stringify(response)) // Cache for 5 minutes

    return res.status(200).send(response)
}
