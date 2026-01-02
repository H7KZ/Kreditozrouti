import { redis } from '@api/clients'
import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import InSISService from '@api/Services/InSISService'
import StudyPlansFilterValidation from '@api/Validations/StudyPlansFilterValidation'
import { Request, Response } from 'express'

/**
 * Retrieves a paginated list of study plans based on complex filtering criteria.
 *
 * This controller caches results in Redis for 5 minutes.
 * It returns the study plan data alongside faceted counts for sidebar filters.
 *
 * @param req - Express request object containing the filter payload.
 * @param res - Express response object.
 * @throws {Exception} 401 - If the validation of the search request fails.
 */
export default async function StudyPlansController(req: Request, res: Response<StudyPlansResponse>) {
    const result = await StudyPlansFilterValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
    }

    const data = result.data

    // Check Cache
    const cacheKey = `insis:study_plans:${JSON.stringify(data)}`
    const cachedData = await redis.get(cacheKey)

    if (cachedData) {
        return res.status(200).send(JSON.parse(cachedData))
    }

    // Fetch Data
    const [plans, facets] = await Promise.all([InSISService.getStudyPlans(data, data.limit, data.offset), InSISService.getStudyPlanFacets(data)])

    const response: StudyPlansResponse = {
        data: plans,
        facets: facets,
        meta: {
            limit: data.limit || 20,
            offset: data.offset || 0,
            count: plans.length
        }
    }

    await redis.setex(cacheKey, 300, JSON.stringify(response))

    return res.status(200).send(response)
}
