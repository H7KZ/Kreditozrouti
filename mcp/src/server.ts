import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerFacultyTools } from '@mcp/Tools/FacultyTools.js'
import { registerCourseTools } from '@mcp/Tools/CourseTools.js'

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'kreditozrouti-mcp',
		version: '1.0.0'
	})
	registerFacultyTools(server)
	registerCourseTools(server)
	return server
}
