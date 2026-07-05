import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { db } from '@mcp/Database/client'
import CourseTools from '@mcp/Tools/CourseTools'
import FacultyTools from '@mcp/Tools/FacultyTools'
import OptimizerTools from '@mcp/Tools/OptimizerTools'
import StudyPlanTools from '@mcp/Tools/StudyPlanTools'
import TimetableTools from '@mcp/Tools/TimetableTools'

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'kreditozrouti-mcp',
		version: '1.0.0'
	})
	FacultyTools.register(server, db)
	CourseTools.register(server, db)
	StudyPlanTools.register(server, db)
	TimetableTools.register(server, db)
	OptimizerTools.register(server, db)
	return server
}
