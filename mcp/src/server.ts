import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerFacultyTools } from '@mcp/Tools/FacultyTools.js'
import { registerCourseTools } from '@mcp/Tools/CourseTools.js'
import { registerStudyPlanTools } from '@mcp/Tools/StudyPlanTools.js'
import { registerTimetableTools } from '@mcp/Tools/TimetableTools.js'

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'kreditozrouti-mcp',
		version: '1.0.0'
	})
	registerFacultyTools(server)
	registerCourseTools(server)
	registerStudyPlanTools(server)
	registerTimetableTools(server)
	return server
}
