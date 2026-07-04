import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { searchCourses, getCourseById } from '@mcp/Services/CourseService.js'
import type { CourseFilter } from '@mcp/Services/CourseService.js'

const SearchCoursesSchema = {
	query: z.string().optional().describe('Free-text search across ident, title, lecturer'),
	faculty_id: z.string().optional().describe('Filter by faculty ID'),
	semester: z.enum(['ZS', 'LS', 'Both']).optional().describe('Filter by semester'),
	language: z.string().optional().describe('Filter by language code (e.g. "CS", "EN")'),
	limit: z.number().int().min(1).max(100).default(20).describe('Max results (1-100)'),
	offset: z.number().int().min(0).default(0).describe('Pagination offset')
}

const GetCourseSchema = {
	id: z.number().int().describe('Course ID')
}

export function registerCourseTools(server: McpServer): void {
	server.tool(
		'vse_search_courses',
		'Search VŠE courses by text, faculty, semester, or language. Times in results are minutes from midnight (0–1439).',
		SearchCoursesSchema,
		async (input) => {
			const filter: CourseFilter = {}
			if (input.query) filter.search = input.query
			if (input.faculty_id) filter.faculty_ids = [input.faculty_id]
			if (input.semester) filter.semesters = [input.semester]
			if (input.language) filter.languages = [input.language]

			const { courses, total } = await searchCourses(filter, input.limit, input.offset)
			return {
				content: [{
					type: 'text',
					text: JSON.stringify({ courses, total }, null, 2)
				}]
			}
		}
	)

	server.tool(
		'vse_get_course',
		'Get a VŠE course by its numeric ID. Times in results are minutes from midnight (0–1439).',
		GetCourseSchema,
		async (input) => {
			const course = await getCourseById(input.id)
			if (!course) {
				return {
					content: [{ type: 'text', text: 'Course not found' }],
					isError: true
				}
			}
			return {
				content: [{
					type: 'text',
					text: JSON.stringify(course, null, 2)
				}]
			}
		}
	)
}
