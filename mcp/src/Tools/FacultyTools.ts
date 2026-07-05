import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { listFaculties } from '@kreditozrouti/core/services'
import { db } from '@mcp/Db/client.js'
import { defineTool, registerTool } from '../tools.js'

const listFacultiesTool = defineTool({
	name: 'vse_list_faculties',
	description: 'List all VŠE faculties',
	schema: {},
	handler: async () => {
		const faculties = await listFaculties(db)
		return {
			content: [{
				type: 'text',
				text: JSON.stringify(faculties, null, 2)
			}]
		}
	},
})

export function registerFacultyTools(server: McpServer): void {
	registerTool(server, db, listFacultiesTool)
}
