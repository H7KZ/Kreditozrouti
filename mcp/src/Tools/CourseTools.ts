import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Kysely } from 'kysely'
import type { Database } from '@kreditozrouti/core/db'
import CourseService from '@kreditozrouti/core/services/CourseService'
import type { CourseFilter } from '@kreditozrouti/types'
import { defineTool, registerTool } from '../tools'

export default class CourseTools {
	private static readonly searchTool = defineTool({
		name: 'vse_search_courses',
		description: 'Search VŠE courses by text, faculty, semester, or language. Times in results are minutes from midnight (0–1439).',
		schema: {
			query: z.string().optional().describe('Free-text search across ident, title, lecturer'),
			faculty_id: z.string().optional().describe('Filter by faculty ID'),
			semester: z.enum(['ZS', 'LS', 'Both']).optional().describe('Filter by semester'),
			language: z.string().optional().describe('Filter by language code (e.g. "CS", "EN")'),
			limit: z.number().int().min(1).max(100).default(20).describe('Max results (1-100)'),
			offset: z.number().int().min(0).default(0).describe('Pagination offset')
		},
		handler: async (input, db) => {
			const filter: CourseFilter = {}
			if (input.query) filter.search = input.query
			if (input.faculty_id) filter.faculty_ids = [input.faculty_id]
			if (input.semester) filter.semesters = [input.semester]
			if (input.language) filter.languages = [input.language]
			const { courses, total } = await CourseService.search(db, filter, input.limit, input.offset)
			return { content: [{ type: 'text', text: JSON.stringify({ courses, total }, null, 2) }] }
		}
	})

	private static readonly getTool = defineTool({
		name: 'vse_get_course',
		description: 'Get a VŠE course by its numeric ID. Times in results are minutes from midnight (0–1439).',
		schema: {
			id: z.number().int().describe('Course ID')
		},
		handler: async (input, db) => {
			const course = await CourseService.getById(db, input.id)
			if (!course) return { content: [{ type: 'text', text: 'Course not found' }], isError: true }
			return { content: [{ type: 'text', text: JSON.stringify(course, null, 2) }] }
		}
	})

	static register(server: McpServer, db: Kysely<Database>): void {
		registerTool(server, db, CourseTools.searchTool)
		registerTool(server, db, CourseTools.getTool)
	}
}
