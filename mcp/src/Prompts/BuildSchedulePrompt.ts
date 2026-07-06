import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { registerPrompt } from '@mcp/tools'

const schema = {
	semester: z.enum(['ZS', 'LS']).describe('ZS = winter semester (září–únor), LS = summer semester (únor–červen)'),
	faculty_id: z.string().optional().describe('Limit to a specific faculty (e.g. "FIS", "FPH"). Omit to search all faculties.'),
}

export default class BuildSchedulePrompt {
	static register(server: McpServer): void {
		registerPrompt(server, {
			name: 'build_schedule',
			title: 'Build Schedule',
			description: 'Scaffold a workflow to help a VŠE student build a conflict-free course schedule for a semester.',
			schema,
			handler: ({ semester, faculty_id }) => {
				const facultyClause = faculty_id ? ` in the ${faculty_id} faculty` : ''
				return {
					messages: [
						{
							role: 'user',
							content: {
								type: 'text',
								text: `You are helping a VŠE student build a conflict-free course schedule for the ${semester} semester${facultyClause}.

Follow this workflow step by step:

1. Read the vse://faculties resource to see all available faculties and their IDs.
2. ${faculty_id ? `Read vse://study-plans/${faculty_id} to show the student available study plans for their faculty.` : 'Ask the student which faculty they are in, then read vse://study-plans/{faculty_id} for their faculty.'}
3. Ask the student which courses they want to take. Use the vse_search_courses tool to help them find courses — filter by faculty_id and semester="${semester}". Remind them that vse_search_courses returns summaries only; you will fetch full detail later.
4. Once the student has chosen a set of courses, call vse_check_timetable_conflicts with their course IDs.
5. If there are conflicts, call vse_optimize_timetable with mode "build" and the same course IDs to find the best conflict-free combination.
6. Present the final schedule clearly. For each selected course unit, show the day and time — times are stored as minutes from midnight, so convert: hours = Math.floor(minutes / 60), mins = minutes % 60, formatted as HH:MM.`,
							},
						},
					],
				}
			},
		})
	}
}
