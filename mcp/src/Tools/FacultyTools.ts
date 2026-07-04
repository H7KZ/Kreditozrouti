import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { listFaculties } from '@mcp/Services/FacultyService.js'

export function registerFacultyTools(server: McpServer): void {
	server.tool('vse_list_faculties', 'List all VŠE faculties', {}, async () => {
		const faculties = await listFaculties()
		return {
			content: [{
				type: 'text',
				text: JSON.stringify(faculties, null, 2)
			}]
		}
	})
}
