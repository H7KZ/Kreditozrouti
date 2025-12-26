import { redis } from '@api/clients'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import InSISService from '@api/Services/InSISService'
import CoursesFilterValidation from '@api/Validations/CoursesFilterValidation'
import { Request, Response } from 'express'

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
