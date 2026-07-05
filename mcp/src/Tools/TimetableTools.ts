import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getCoursesWithRelations } from '@kreditozrouti/core/services'
import type { MCPCourseUnitSlot } from '@kreditozrouti/core/services'
import { unitsConflict } from '@kreditozrouti/core/domain'
import { db } from '@mcp/Db/client.js'

const CheckTimetableConflictsSchema = {
	course_ids: z.array(z.number().int()).min(1).max(30).describe('List of course IDs to check for conflicts')
}

interface SlotWithCourse {
	course_id: number
	course_ident: string
	slot: MCPCourseUnitSlot
}

interface ConflictEntry {
	course_a_id: number
	course_a_ident: string
	course_b_id: number
	course_b_ident: string
	day: string | null
	time_from: number
	time_to: number
}

export function registerTimetableTools(server: McpServer): void {
	server.tool(
		'vse_check_timetable_conflicts',
		'Check a set of VŠE courses for timetable conflicts. Times are minutes from midnight (0–1439).',
		CheckTimetableConflictsSchema,
		async (input) => {
			const { course_ids } = input
			const { courses } = await getCoursesWithRelations(db, { ids: course_ids }, course_ids.length, 0)

			// Collect all slots that have valid time ranges
			const slotsWithCourse: SlotWithCourse[] = []
			for (const course of courses) {
				for (const unit of course.units) {
					for (const slot of unit.slots) {
						if (slot.time_from != null && slot.time_to != null) {
							slotsWithCourse.push({
								course_id: course.id,
								course_ident: course.ident,
								slot
							})
						}
					}
				}
			}

			// Find conflicts between slots from DIFFERENT courses
			const conflicts: ConflictEntry[] = []
			for (let i = 0; i < slotsWithCourse.length; i++) {
				for (let j = i + 1; j < slotsWithCourse.length; j++) {
					const a = slotsWithCourse[i]!
					const b = slotsWithCourse[j]!

					// Only check slots from different courses
					if (a.course_id === b.course_id) continue

					const aSlot = a.slot
					const bSlot = b.slot

					const conflict = unitsConflict(
						{ day: aSlot.day ?? undefined, date: aSlot.date ?? undefined, timeFrom: aSlot.time_from!, timeTo: aSlot.time_to! },
						{ day: bSlot.day ?? undefined, date: bSlot.date ?? undefined, timeFrom: bSlot.time_from!, timeTo: bSlot.time_to! }
					)

					if (conflict) {
						conflicts.push({
							course_a_id: a.course_id,
							course_a_ident: a.course_ident,
							course_b_id: b.course_id,
							course_b_ident: b.course_ident,
							day: aSlot.day ?? null,
							time_from: aSlot.time_from!,
							time_to: aSlot.time_to!
						})
					}
				}
			}

			return {
				content: [{
					type: 'text',
					text: JSON.stringify({ has_conflicts: conflicts.length > 0, conflicts }, null, 2)
				}]
			}
		}
	)
}
