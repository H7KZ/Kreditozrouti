import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { optimize } from '@mcp/Services/OptimizerService.js'
import type { OptimizeRequest } from '@mcp/Domain/optimizer.js'

const DaySchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])

const TimeSelectionSchema = z.object({
	day: DaySchema.optional(),
	time_from: z.number().int().min(0).max(1439),
	time_to: z.number().int().min(0).max(1439)
})

const SolverConstraintsSchema = z.object({
	required_course_ids: z.array(z.number().int()).optional(),
	excluded_course_ids: z.array(z.number().int()).optional(),
	credit_min: z.number().optional(),
	credit_max: z.number().optional(),
	blackout_windows: z.array(TimeSelectionSchema).optional(),
	preferred_days: z.array(DaySchema).optional(),
	max_consecutive_minutes: z.number().optional()
}).optional()

const OptimizerInputSchema = {
	course_ids: z.array(z.number().int()).min(1).max(30).describe('Course IDs to optimize (max 30)'),
	constraints: SolverConstraintsSchema.describe('Optional scheduling constraints'),
	mode: z.enum(['build', 'explore']).default('build').describe('build: find best schedule; explore: try adding courses one by one'),
	locked_unit_ids: z.array(z.number().int()).optional().describe('Unit IDs to keep fixed'),
	explore_course_ids: z.array(z.number().int()).optional().describe('Courses to try adding (explore mode only, max 20)')
}

export function registerOptimizerTools(server: McpServer): void {
	server.tool('vse_optimize_timetable', 'Find optimal non-conflicting timetable for a set of courses', OptimizerInputSchema, async (input) => {
		const request: OptimizeRequest = {
			course_ids: input.course_ids,
			constraints: input.constraints ?? {},
			mode: input.mode,
			locked_unit_ids: input.locked_unit_ids,
			explore_course_ids: input.explore_course_ids
		}
		const result = await optimize(request)
		return {
			content: [{
				type: 'text',
				text: JSON.stringify(result, null, 2)
			}]
		}
	})
}
