import { redis } from '@api/clients'
import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import InSISService from '@api/Services/InSISService'
import StudyPlansFilterValidation from '@api/Validations/StudyPlansFilterValidation'
import { Request, Response } from 'express'

export default async function StudyPlansController(req: Request, res: Response<StudyPlansResponse>) {
    const result = await StudyPlansFilterValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
    }

    const data = result.data

    const cacheKey = `study_plans:${JSON.stringify(data)}`
    const cachedData = await redis.get(`insis:study_plans:${cacheKey}`)

    if (cachedData) {
        return res.status(200).send(JSON.parse(cachedData))
    }

    const [plans, facets] = await Promise.all([InSISService.getStudyPlans(data, data.limit, data.offset), InSISService.getStudyPlanFacets(data)])

    const response = {
        data: plans,
        facets: facets,
        meta: {
            limit: data.limit || 20,
            offset: data.offset || 0,
            count: plans.length
        }
    }

    await redis.setex(`insis:study_plans:${cacheKey}`, 300, JSON.stringify(response)) // Cache for 5 minutes

    return res.status(200).send(response)
}
