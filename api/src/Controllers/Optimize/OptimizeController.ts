import type { OptimizeRequest } from '@shared/http/optimize'
import { Request, Response } from 'express'
import * as z from 'zod'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import { Errors } from '@api/Errors'
import OptimizeService from '@api/Services/OptimizeService'
import { DaySchema, TimeSelectionSchema } from '@api/Validations'

const SolverConstraintsSchema = z.object({
	required_course_ids: z.array(z.coerce.number()).optional(),
	excluded_course_ids: z.array(z.coerce.number()).optional(),
	credit_min: z.coerce.number().min(0).optional(),
	credit_max: z.coerce.number().min(0).optional(),
	blackout_windows: z.array(TimeSelectionSchema.refine(data => data.day != null, { message: 'blackout_windows require a day' })).optional(),
	preferred_days: z.array(DaySchema).optional(),
	max_consecutive_minutes: z.coerce.number().min(0).optional()
})

const OptimizeRequestSchema = z.object({
	course_ids: z.array(z.coerce.number()).min(1),
	constraints: SolverConstraintsSchema,
	mode: z.enum(['build', 'add']).default('build'),
	locked_unit_ids: z.array(z.coerce.number()).optional()
}) satisfies z.ZodType<OptimizeRequest>

/**
 * Runs the timetable solver against a candidate course pool and returns
 * ranked, diversity-filtered timetable candidates.
 *
 * @param req - Express request object containing the OptimizeRequest payload.
 * @param res - Express response object.
 * @throws {ApiError} 403 - If validation of the request body fails.
 */
export default async function OptimizeController(req: Request, res: Response) {
	LoggerAPIContext.add({ body: req.body })

	const result = await OptimizeRequestSchema.safeParseAsync(req.body)

	if (!result.success) throw Errors.validation(result.error.issues)

	const response = await OptimizeService.optimize(result.data)

	LoggerAPIContext.add({
		candidate_count: response.full_candidates.length,
		partial: response.partial,
		mode: result.data.mode
	})

	return res.status(200).send(response)
}
