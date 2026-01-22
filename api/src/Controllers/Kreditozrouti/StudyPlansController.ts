import { redis } from '@api/clients'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import StudyPlanService from '@api/Services/StudyPlanService'
import StudyPlansFilterValidation from '@api/Validations/StudyPlansFilterValidation'
import { Request, Response } from 'express'

/**
 * Retrieves a paginated list of study plans with full relations based on filtering criteria.
 *
 * Returns study plans with:
 * - Faculty information
 * - Course associations (IDs, idents, groups, categories)
 * - Statistics (total courses, compulsory vs elective)
 *
 * Results are cached in Redis for 5 minutes.
 *
 * @param req - Express request object containing the filter payload.
 * @param res - Express response object.
 * @throws {Exception} 400 - If the validation of the search request fails.
 */
export default async function StudyPlansController(req: Request, res: Response<StudyPlansResponse>) {
	LoggerAPIContext.add(res, { body: req.body })

	const result = await StudyPlansFilterValidation.safeParseAsync(req.body)

	if (!result.success) {
		throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
	}

	const filter = result.data

	// Build cache key from filter
	const cacheKey = `insis:study_plans:v2:${JSON.stringify(filter)}`
	const cachedData = await redis.get(cacheKey)

	if (cachedData) {
		LoggerAPIContext.add(res, { cache: true })
		return res.status(200).send(JSON.parse(cachedData))
	}

	// Fetch data with relations
	const [{ plans, total }, facets] = await Promise.all([
		StudyPlanService.getStudyPlansWithRelations(filter, filter.limit, filter.offset),
		StudyPlanService.getStudyPlanFacets(filter)
	])

	LoggerAPIContext.add(res, {
		cache: false,
		plans_count: plans.length,
		total_count: total,
		facets_count: Object.keys(facets).length
	})

	const response: StudyPlansResponse = {
		data: plans,
		facets,
		meta: {
			limit: filter.limit ?? 20,
			offset: filter.offset ?? 0,
			count: plans.length,
			total
		}
	}

	// Cache for 5 minutes
	await redis.setex(cacheKey, 300, JSON.stringify(response))

	return res.status(200).send(response)
}
