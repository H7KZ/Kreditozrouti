import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { registerPrompt } from '@mcp/tools'

const schema = {
	faculty_id: z.string().describe('Faculty ID to explore (e.g. "FIS", "FPH"). Get valid IDs from the vse://faculties resource.'),
}

export default class ExplorePlanPrompt {
	static register(server: McpServer): void {
		registerPrompt(server, {
			name: 'explore_plan',
			title: 'Explore Study Plan',
			description: 'Browse the courses in a VŠE faculty study plan.',
			schema,
			handler: ({ faculty_id }) => ({
				messages: [
					{
						role: 'user',
						content: {
							type: 'text',
							text: `You are helping a VŠE student explore the study plans for faculty ${faculty_id}.

Follow this workflow:

1. Read vse://study-plans/${faculty_id} to list all study plans for this faculty.
2. Ask the student which study plan they want to explore.
3. Call vse_get_study_plan with the plan's numeric ID to get the full plan including its course list.
4. Summarize the courses grouped by semester (ZS/LS) and category (required/elective/optional). Include credit counts per group.
5. Ask if the student wants to check for scheduling conflicts or optimize a selection of these courses. If yes, continue with the build_schedule workflow.`,
						},
					},
				],
			}),
		})
	}
}
