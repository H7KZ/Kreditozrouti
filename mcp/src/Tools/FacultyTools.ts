import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Kysely } from 'kysely'
import type { Database } from '@kreditozrouti/core/db'
import { listFaculties } from '@kreditozrouti/core/services'
import { defineTool, registerTool } from '../tools.js'

const listFacultiesTool = defineTool({
	name: 'vse_list_faculties',
	description: 'List all VŠE faculties',
	schema: {},
	handler: async (_args, db) => {
		const faculties = await listFaculties(db)
		return {
			content: [{
				type: 'text',
				text: JSON.stringify(faculties, null, 2)
			}]
		}
	},
})

export function registerFacultyTools(server: McpServer, db: Kysely<Database>): void {
	registerTool(server, db, listFacultiesTool)
}
