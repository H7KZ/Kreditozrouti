import type { CoursesFilter } from '@shared/http/courses'
import { Request, Response } from 'express'
import * as z from 'zod'
import { InSISStudyPlanCourseCategoryValues, InSISStudyPlanCourseGroupValues } from '@shared/domain/insis'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import { Errors } from '@api/Errors'
import CourseService from '@api/Services/CourseService'
import { SemesterSchema, TimeSelectionSchema } from '@api/Validations'

const CoursesFilterSchema = z.object({
	// Identity Filters
	ids: z.array(z.coerce.number()).optional(),
	idents: z.array(z.string()).optional(),
	title: z.string().optional(),
	search: z.string().max(200).optional(),

	// Academic Period Filters
	semesters: z.array(SemesterSchema).optional(),
	years: z.array(z.coerce.number()).optional(),

	// Organizational Filters
	faculty_ids: z.array(z.string()).optional(),
	levels: z.array(z.string()).optional(),
	languages: z.array(z.string()).optional(),

	// Time Filters
	include_times: z.array(TimeSelectionSchema).optional(),
	exclude_times: z.array(TimeSelectionSchema).optional(),

	// Personnel Filters
	lecturers: z.array(z.string()).optional(),

	// Study Plan Filters
	study_plan_ids: z.array(z.coerce.number()).optional(),
	groups: z.array(z.enum(InSISStudyPlanCourseGroupValues)).optional(),
	categories: z.array(z.enum(InSISStudyPlanCourseCategoryValues)).optional(),

	// Course Properties Filters
	ects: z.array(z.coerce.number()).optional(),
	mode_of_completions: z.array(z.string()).optional(),
	mode_of_deliveries: z.array(z.string()).optional(),

	// Availability Filters
	completed_course_idents: z.array(z.coerce.string()).optional(),

	// Sorting
	sort_by: z.enum(['ident', 'title', 'ects', 'faculty', 'year', 'semester']).optional().default('ident'),
	sort_dir: z.enum(['asc', 'desc']).optional().default('asc'),

	// Pagination
	limit: z.coerce.number().min(0).max(500).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0)
}) satisfies z.ZodType<CoursesFilter>

export type { CoursesFilter } from '@shared/http/courses'

/**
 * Retrieves a paginated list of courses with full relations based on complex filtering criteria.
 *
 * Returns courses with:
 * - Faculty information
 * - Timetable units and slots
 * - Assessment methods
 * - Study plan associations (when filtering by study_plan_id)
 *
 * @param req - Express request object containing the filter payload.
 * @param res - Express response object.
 * @throws {ApiError} 403 - If the validation of the search request fails.
 */
export default async function CoursesController(req: Request, res: Response<CoursesResponse>) {
	LoggerAPIContext.add({ body: req.body })

	// 1. Validation
	const result = await CoursesFilterSchema.safeParseAsync(req.body)

	if (!result.success) throw Errors.validation(result.error.issues)

	const filter = result.data

	// 2. Service Call (Parallel Execution)
	const [{ courses, total }, facets] = await Promise.all([
		CourseService.getCoursesWithRelations(filter, filter.limit, filter.offset),
		CourseService.getCourseFacets(filter)
	])

	LoggerAPIContext.add({
		courses_count: courses.length,
		total_count: total,
		facets_count: Object.keys(facets).length
	})

	// 3. Response Assembly
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

	return res.status(200).send(response)
}
