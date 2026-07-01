import type { OptimizeRequest } from '@shared/http/optimize'
import { Request, Response } from 'express'
import * as z from 'zod'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import { Errors } from '@api/Errors'
import OptimizeService from '@api/Services/OptimizeService'
import { DaySchema, TimeSelectionSchema } from '@api/Validations'

const SolverConstraintsSchema = z.object({
	credit_min: z.coerce.number().min(0).optional(),
	credit_max: z.coerce.number().min(0).optional(),
	blackout_windows: z
		.array(TimeSelectionSchema.refine(data => data.day != null, { message: 'blackout_windows require a day' }))
		.optional(),
	preferred_days: z.array(DaySchema).optional(),
	max_consecutive_minutes: z.coerce.number().min(0).optional()
})

const OptimizeRequestSchema = z.object({
	course_ids: z.array(z.coerce.number()).min(1),
	constraints: SolverConstraintsSchema
}) satisfies z.ZodType<OptimizeRequest>

export default async function OptimizeController(req: Request, res: Response) {
	LoggerAPIContext.add({ body: req.body })

	const result = await OptimizeRequestSchema.safeParseAsync(req.body)
	if (!result.success) throw Errors.validation(result.error.issues)

	const response = await OptimizeService.optimize(result.data)

	LoggerAPIContext.add({
		full_count: response.full_candidates.length,
		removal_count: response.removal_candidates.length,
		partial: response.partial
	})

	return res.status(200).send(response)
}
