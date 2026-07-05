import type { Database } from '@kreditozrouti/types'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import type { Kysely } from 'kysely'
import FacultyService from '@kreditozrouti/core/services/FacultyService'
import { defineTool, registerTool } from '@mcp/tools'

export default class FacultyTools {
	private static readonly listTool = defineTool({
		name: 'vse_list_faculties',
		description: 'List all VŠE faculties',
		schema: {},
		handler: async (_args, db) => {
			const faculties = await FacultyService.list(db)
			return { content: [{ type: 'text', text: JSON.stringify(faculties, null, 2) }] }
		}
	})

	static register(server: McpServer, db: Kysely<Database>): void {
		registerTool(server, db, FacultyTools.listTool)
	}
}
