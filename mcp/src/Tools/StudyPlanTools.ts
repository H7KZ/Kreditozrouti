import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Kysely } from 'kysely'
import type { Database } from '@kreditozrouti/core/db'
import StudyPlanService from '@kreditozrouti/core/services/StudyPlanService.js'
import { defineTool, registerTool } from '../tools.js'

export default class StudyPlanTools {
	private static readonly listTool = defineTool({
		name: 'vse_list_study_plans',
		description: 'List VŠE study plans, optionally filtered by faculty ID.',
		schema: {
			faculty_id: z.string().optional().describe('Filter by faculty ID')
		},
		handler: async (input, db) => {
			const plans = await StudyPlanService.list(db, input.faculty_id)
			return { content: [{ type: 'text', text: JSON.stringify(plans, null, 2) }] }
		}
	})

	private static readonly getTool = defineTool({
		name: 'vse_get_study_plan',
		description: 'Get a VŠE study plan by its numeric ID, including its course list.',
		schema: {
			id: z.number().int().describe('Study plan ID')
		},
		handler: async (input, db) => {
			const plan = await StudyPlanService.getById(db, input.id)
			if (!plan) return { content: [{ type: 'text', text: 'Study plan not found' }], isError: true }
			return { content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }] }
		}
	})

	static register(server: McpServer, db: Kysely<Database>): void {
		registerTool(server, db, StudyPlanTools.listTool)
		registerTool(server, db, StudyPlanTools.getTool)
	}
}
