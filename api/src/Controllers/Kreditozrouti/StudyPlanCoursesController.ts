import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import StudyPlanCoursesResponse from '@api/Controllers/Kreditozrouti/types/StudyPlanCoursesResponse'
import { Errors } from '@api/Errors'
import CourseService from '@api/Services/CourseService'
import type { StudyPlanCoursesFilter } from '@shared/http/study-plans'
import { Request, Response } from 'express'
import * as z from 'zod'

const StudyPlanCoursesFilterSchema = z.object({
	study_plan_ids: z.array(z.coerce.number())
}) satisfies z.ZodType<StudyPlanCoursesFilter>

export type { StudyPlanCoursesFilter } from '@shared/http/study-plans'

/**
 * Retrieves a list of courses associated with a specific study plan, including full relations.
 *
 * @param req - Express request object containing the filter payload.
 * @param res - Express response object.
 * @throws {ApiError} 403 - If the validation of the search request fails.
 */
export default async function StudyPlanCoursesController(req: Request, res: Response<StudyPlanCoursesResponse>) {
	LoggerAPIContext.add(res, { body: req.body })

	// 1. Validation
	const result = await StudyPlanCoursesFilterSchema.safeParseAsync(req.body)

	if (!result.success) throw Errors.validation(result.error.issues)

	const studyPlanIds = result.data.study_plan_ids

	// 2. Service Call
	const courses = await CourseService.getCoursesByStudyPlan(studyPlanIds)

	LoggerAPIContext.add(res, {
		courses_count: courses.length
	})

	// 3. Response Assembly
	const response: StudyPlanCoursesResponse = {
		data: courses,
		meta: {
			count: courses.length,
			total: courses.length
		}
	}

	return res.status(200).send(response)
}
