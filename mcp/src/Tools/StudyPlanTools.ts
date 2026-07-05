import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { listStudyPlans, getStudyPlanById } from '@kreditozrouti/core/services'
import { db } from '@mcp/Db/client.js'

const ListStudyPlansSchema = {
	faculty_id: z.string().optional().describe('Filter by faculty ID')
}

const GetStudyPlanSchema = {
	id: z.number().int().describe('Study plan ID')
}

export function registerStudyPlanTools(server: McpServer): void {
	server.tool(
		'vse_list_study_plans',
		'List VŠE study plans, optionally filtered by faculty ID.',
		ListStudyPlansSchema,
		async (input) => {
			const plans = await listStudyPlans(db, input.faculty_id)
			return {
				content: [{
					type: 'text',
					text: JSON.stringify(plans, null, 2)
				}]
			}
		}
	)

	server.tool(
		'vse_get_study_plan',
		'Get a VŠE study plan by its numeric ID, including its course list.',
		GetStudyPlanSchema,
		async (input) => {
			const plan = await getStudyPlanById(db, input.id)
			if (!plan) {
				return {
					content: [{ type: 'text', text: 'Study plan not found' }],
					isError: true
				}
			}
			return {
				content: [{
					type: 'text',
					text: JSON.stringify(plan, null, 2)
				}]
			}
		}
	)
}
