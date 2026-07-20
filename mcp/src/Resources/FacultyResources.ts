import type { Database } from '@kreditozrouti/types'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Kysely } from 'kysely'
import FacultyService from '@kreditozrouti/core/services/FacultyService'
import { defineResource, registerResource } from '@mcp/tools'

export default class FacultyResources {
	private static readonly facultiesResource = defineResource({
		name: 'VŠE Faculties',
		uri: 'vse://faculties',
		description: 'All VŠE faculties with their IDs (e.g. "FIS", "FPH"). Read this before filtering courses or study plans by faculty.',
		mimeType: 'application/json',
		handler: async (_uri, db) => {
			const faculties = await FacultyService.list(db)
			return {
				contents: [{ uri: 'vse://faculties', mimeType: 'application/json', text: JSON.stringify(faculties, null, 2) }]
			}
		}
	})

	static register(server: McpServer, db: Kysely<Database>): void {
		registerResource(server, db, FacultyResources.facultiesResource)
	}
}
