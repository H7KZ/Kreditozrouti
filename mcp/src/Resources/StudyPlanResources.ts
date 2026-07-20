import type { Database } from '@kreditozrouti/types'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Kysely } from 'kysely'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import StudyPlanService from '@kreditozrouti/core/services/StudyPlanService'
import { defineResource, registerResource, registerResourceTemplate } from '@mcp/tools'

export default class StudyPlanResources {
	private static readonly allPlansResource = defineResource({
		name: 'VŠE Study Plans',
		uri: 'vse://study-plans',
		description: 'All VŠE study plans across all faculties.',
		mimeType: 'application/json',
		handler: async (_uri, db) => {
			const plans = await StudyPlanService.list(db)
			return {
				contents: [{ uri: 'vse://study-plans', mimeType: 'application/json', text: JSON.stringify(plans, null, 2) }]
			}
		}
	})

	static register(server: McpServer, db: Kysely<Database>): void {
		registerResource(server, db, StudyPlanResources.allPlansResource)

		const byFacultyTemplate = new ResourceTemplate('vse://study-plans/{faculty_id}', { list: undefined })
		registerResourceTemplate(server, db, {
			name: 'VŠE Study Plans by Faculty',
			template: byFacultyTemplate,
			description: 'Study plans for a specific VŠE faculty. URI: vse://study-plans/{faculty_id}',
			mimeType: 'application/json',
			handler: async (uri, variables, db) => {
				const faculty_id = variables.faculty_id ?? ''
				const plans = await StudyPlanService.list(db, faculty_id)
				return {
					contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify(plans, null, 2) }]
				}
			}
		})
	}
}
