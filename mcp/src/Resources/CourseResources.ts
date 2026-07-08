import type { Database } from '@kreditozrouti/types'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import type { Kysely } from 'kysely'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp'
import CourseService from '@kreditozrouti/core/services/CourseService'
import { registerResourceTemplate } from '@mcp/tools'

export default class CourseResources {
	static register(server: McpServer, db: Kysely<Database>): void {
		const template = new ResourceTemplate('vse://course/{id}', {
			list: undefined // enumerating all courses not practical
		})

		registerResourceTemplate(server, db, {
			name: 'VŠE Course',
			template,
			description:
				'Full VŠE course detail by numeric ID, including units and time slots. Times are minutes from midnight (0–1439). URI: vse://course/{id}',
			mimeType: 'application/json',
			handler: async (uri, variables, db) => {
				const id = Number(variables.id)
				if (Number.isNaN(id)) {
					return {
						contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify({ error: 'Invalid course ID' }) }]
					}
				}
				const course = await CourseService.getById(db, id)
				if (!course) {
					return {
						contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify({ error: 'Course not found' }) }]
					}
				}
				return {
					contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify(course, null, 2) }]
				}
			}
		})
	}
}
