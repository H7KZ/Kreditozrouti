import type { StudyPlansFilter } from '@shared/http/study-plans'
import { Request, Response } from 'express'
import * as z from 'zod'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
import { Errors } from '@api/Errors'
import InSISService from '@api/Services/InSISService'
import StudyPlanService from '@api/Services/StudyPlanService'
import { SemesterSchema } from '@api/Validations/index'

const StudyPlansFilterSchema = z.object({
	// Identity Filters
	ids: z.array(z.coerce.number()).optional(),
	idents: z.array(z.string()).optional(),
	title: z.string().optional(),

	// Academic Period Filters
	semesters: z.array(SemesterSchema).optional(),
	years: z.array(z.coerce.number()).optional(),

	// Organizational Filters
	faculty_ids: z.array(z.string()).optional(),
	levels: z.array(z.string()).optional(),
	mode_of_studies: z.array(z.string()).optional(),
	study_lengths: z.array(z.string()).optional(),

	// Course Filters (filter plans by courses they contain)
	has_course_ids: z.array(z.coerce.number()).optional(),
	has_course_idents: z.array(z.string()).optional(),

	// Sorting
	sort_by: z.enum(['ident', 'title', 'faculty_id', 'year', 'semester', 'level']).optional().default('ident'),
	sort_dir: z.enum(['asc', 'desc']).optional().default('asc'),

	// Pagination
	limit: z.coerce.number().min(0).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0)
}) satisfies z.ZodType<StudyPlansFilter>

export type { StudyPlansFilter } from '@shared/http/study-plans'

/**
 * Retrieves a paginated list of study plans with full relations based on filtering criteria.
 *
 * Returns study plans with:
 * - Faculty information
 * - Course associations (IDs, idents, groups, categories)
 *
 * @param req - Express request object containing the filter payload.
 * @param res - Express response object.
 * @throws {ApiError} 403 - If the validation of the search request fails.
 */
export default async function StudyPlansController(req: Request, res: Response<StudyPlansResponse>) {
	LoggerAPIContext.add(res, { body: req.body })

	// 1. Validation
	const result = await StudyPlansFilterSchema.safeParseAsync(req.body)

	if (!result.success) throw Errors.validation(result.error.issues)

	const filter = result.data

	filter.years ??= InSISService.getPeriodsForLastYears(4).map(p => p.year)

	// 2. Service Call (Parallel Execution)
	const [{ plans, total }, facets] = await Promise.all([
		StudyPlanService.getStudyPlansWithRelations(filter, filter.limit, filter.offset),
		StudyPlanService.getStudyPlanFacets(filter)
	])

	LoggerAPIContext.add(res, {
		plans_count: plans.length,
		total_count: total,
		facets_count: Object.keys(facets).length
	})

	// 3. Response Assembly
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

	return res.status(200).send(response)
}
