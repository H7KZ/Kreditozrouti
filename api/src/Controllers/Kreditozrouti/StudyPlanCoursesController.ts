import { redis } from '@api/clients'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import StudyPlanCoursesResponse from '@api/Controllers/Kreditozrouti/types/StudyPlanCoursesResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import CourseService from '@api/Services/CourseService'
import StudyPlanCoursesFilterValidation from '@api/Validations/StudyPlanCoursesFilterValidation'
import { Request, Response } from 'express'

/**
 * Retrieves a list of courses associated with a specific study plan, including full relations based on complex filtering criteria.
 *
 * Results are cached in Redis for 5 minutes.
 *
 * @param req - Express request object containing the filter payload.
 * @param res - Express response object.
 * @throws {Exception} 400 - If the validation of the search request fails.
 */
export default async function StudyPlanCoursesController(req: Request, res: Response<StudyPlanCoursesResponse>) {
	LoggerAPIContext.add(res, { params: req.params })

	// 1. Validation
	const result = await StudyPlanCoursesFilterValidation.safeParseAsync(req.params.study_plan_id)

	if (!result.success) {
		throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', {
			zodIssues: result.error.issues
		})
	}

	const studyPlanIds = result.data.study_plan_ids

	// 2. Cache Check
	const cacheKey = `insis:study_plans:courses:${studyPlanIds.join(':')}`
	const cachedData = await redis.get(cacheKey)

	if (cachedData) {
		LoggerAPIContext.add(res, { cache: true })
		return res.status(200).send(JSON.parse(cachedData))
	}

	// 3. Service Call
	const courses = await CourseService.getCoursesByStudyPlan(studyPlanIds)

	LoggerAPIContext.add(res, {
		cache: false,
		courses_count: courses.length
	})

	// 4. Response Assembly
	// LTS Note: The type 'CoursesResponse' is now strictly enforced against the data returned by the service.
	const response: StudyPlanCoursesResponse = {
		data: courses,
		meta: {
			count: courses.length,
			total: courses.length
		}
	}

	// 5. Cache Set (TTL: 5 minutes)
	await redis.setex(cacheKey, 300, JSON.stringify(response))

	return res.status(200).send(response)
}
