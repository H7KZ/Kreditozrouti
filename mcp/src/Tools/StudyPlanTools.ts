import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Kysely } from 'kysely'
import type { Database } from '@kreditozrouti/core/db'
import { listStudyPlans, getStudyPlanById } from '@kreditozrouti/core/services'
import { defineTool, registerTool } from '../tools.js'

const ListStudyPlansSchema = {
	faculty_id: z.string().optional().describe('Filter by faculty ID')
}

const GetStudyPlanSchema = {
	id: z.number().int().describe('Study plan ID')
}

const listStudyPlansTool = defineTool({
	name: 'vse_list_study_plans',
	description: 'List VŠE study plans, optionally filtered by faculty ID.',
	schema: ListStudyPlansSchema,
	handler: async (input, db) => {
		const plans = await listStudyPlans(db, input.faculty_id)
		return {
			content: [{
				type: 'text',
				text: JSON.stringify(plans, null, 2)
			}]
		}
	},
})

const getStudyPlanTool = defineTool({
	name: 'vse_get_study_plan',
	description: 'Get a VŠE study plan by its numeric ID, including its course list.',
	schema: GetStudyPlanSchema,
	handler: async (input, db) => {
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
	},
})

export function registerStudyPlanTools(server: McpServer, db: Kysely<Database>): void {
	registerTool(server, db, listStudyPlansTool)
	registerTool(server, db, getStudyPlanTool)
}
