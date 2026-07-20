import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '@mcp/Database/client'
import BuildSchedulePrompt from '@mcp/Prompts/BuildSchedulePrompt'
import ExplorePlanPrompt from '@mcp/Prompts/ExplorePlanPrompt'
import CourseResources from '@mcp/Resources/CourseResources'
import FacultyResources from '@mcp/Resources/FacultyResources'
import StudyPlanResources from '@mcp/Resources/StudyPlanResources'
import CourseTools from '@mcp/Tools/CourseTools'
import OptimizerTools from '@mcp/Tools/OptimizerTools'
import TimetableTools from '@mcp/Tools/TimetableTools'

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'kreditozrouti-mcp',
		version: '1.0.0'
	})

	// Tools — model-driven actions
	CourseTools.register(server, db)
	TimetableTools.register(server, db)
	OptimizerTools.register(server, db)

	// Resources — application-controlled read-only context data
	FacultyResources.register(server, db)
	StudyPlanResources.register(server, db)
	CourseResources.register(server, db)

	// Prompts — user-invocable workflow templates
	BuildSchedulePrompt.register(server)
	ExplorePlanPrompt.register(server)

	return server
}
