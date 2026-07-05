import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '@mcp/Db/client.js'
import { registerFacultyTools } from '@mcp/Tools/FacultyTools.js'
import { registerCourseTools } from '@mcp/Tools/CourseTools.js'
import { registerStudyPlanTools } from '@mcp/Tools/StudyPlanTools.js'
import { registerTimetableTools } from '@mcp/Tools/TimetableTools.js'
import { registerOptimizerTools } from '@mcp/Tools/OptimizerTools.js'

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'kreditozrouti-mcp',
		version: '1.0.0'
	})
	registerFacultyTools(server, db)
	registerCourseTools(server, db)
	registerStudyPlanTools(server, db)
	registerTimetableTools(server, db)
	registerOptimizerTools(server, db)
	return server
}
