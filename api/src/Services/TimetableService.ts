import { mysql } from '@api/clients'
import {
	CourseTable,
	CourseTimetableSlot,
	CourseTimetableSlotTable,
	CourseTimetableUnitTable,
	CourseTimetableUnitWithSlots,
	CourseWithRelations,
	StudyPlanCourseTable
} from '@api/Database/types'
import { TimetableGenerated, TimetableSlot, TimetableTimeConflict } from '@api/Interfaces/Timetable'
import CourseService from '@api/Services/CourseService'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation'

/**
 * Service for automatic and assisted timetable generation.
 * Handles heuristic scheduling, conflict detection, and schedule analysis.
 *
 * Future use cases:
 * - Professors creating recommended schedules for first-year students
 * - Students auto-generating conflict-free schedules
 * - Administrators analyzing course scheduling patterns
 */
export default class TimetableService {
	/**
	 * Generates an optimal timetable for a given study plan.
	 *
	 * Algorithm:
	 * 1. Fetches compulsory courses for the plan.
	 * 2. Uses `selectBestSlot` to score and pick non-conflicting slots.
	 * 3. Attempts to fill remaining capacity with elective courses if requested.
	 * 4. Returns the schedule, list of conflicts, and coverage statistics.
	 */
	static async generateForStudyPlan(
		studyPlanId: number,
		options: Partial<CoursesFilter> &
			Partial<{
				preferredDays?: string[]
				preferredTimeFrom?: number
				preferredTimeTo?: number
				maxEcts?: number
				includeElectives?: boolean
			}>
	): Promise<TimetableGenerated> {
		// Fetch study plan courses
		const planCourses = await mysql
			.selectFrom(`${StudyPlanCourseTable._table} as spc`)
			.selectAll('spc')
			.where('spc.study_plan_id', '=', studyPlanId)
			.execute()

		// Separate compulsory and elective
		const compulsoryIdents = planCourses.filter(c => c.category === 'compulsory').map(c => c.course_ident)
		const electiveIdents = planCourses.filter(c => c.category === 'elective').map(c => c.course_ident)

		// Fetch course data with timetables
		const { courses } = await CourseService.getCoursesWithRelations(
			{
				ident: [...compulsoryIdents, ...(options.includeElectives ? electiveIdents : [])],
				semester: options.semester,
				year: options.year
			},
			100,
			0
		)

		const selectedSlots: TimetableSlot[] = []
		const conflicts: TimetableTimeConflict[] = []
		const warnings: string[] = []
		let totalEcts = 0

		// Process compulsory courses first
		const compulsoryCourses = courses.filter(c => compulsoryIdents.includes(c.ident))
		const misssingCompulsory: string[] = []

		for (const courseIdent of compulsoryIdents) {
			const course = compulsoryCourses.find(c => c.ident === courseIdent)
			if (!course) {
				misssingCompulsory.push(courseIdent)
				warnings.push(`Compulsory course ${courseIdent} not found for this semester`)
				continue
			}

			const slotResult = this.selectBestSlot(course, selectedSlots, options)
			if (slotResult.slot) {
				selectedSlots.push(slotResult.slot)
				totalEcts += course.ects ?? 0
			} else if (slotResult.conflict) {
				conflicts.push(slotResult.conflict)
				warnings.push(`Conflict for compulsory course ${course.ident}: ${slotResult.reason}`)
			}
		}

		// Process elective courses if requested
		if (options.includeElectives) {
			const electiveCourses = courses.filter(c => electiveIdents.includes(c.ident))

			for (const course of electiveCourses) {
				// Check ECTS limit
				if (options.maxEcts && totalEcts + (course.ects ?? 0) > options.maxEcts) {
					continue
				}

				const slotResult = this.selectBestSlot(course, selectedSlots, options)
				if (slotResult.slot) {
					selectedSlots.push(slotResult.slot)
					totalEcts += course.ects ?? 0
				}
			}
		}

		// Calculate total hours
		const totalMinutes = selectedSlots.reduce((sum, slot) => {
			return sum + (slot.time_to - slot.time_from)
		}, 0)

		return {
			slots: selectedSlots,
			total_ects: totalEcts,
			total_hours: Math.round((totalMinutes / 60) * 10) / 10,
			conflicts,
			warnings,
			coverage: {
				compulsory_fulfilled: misssingCompulsory.length === 0 && conflicts.length === 0,
				missing_compulsory: misssingCompulsory,
				elective_count: selectedSlots.filter(s => electiveIdents.includes(s.course_ident)).length
			}
		}
	}

	/**
	 * Checks if a specific set of selected slots contains any time conflicts.
	 * Useful for validating a manual selection from the frontend.
	 */
	static async checkConflicts(selections: { course_id: number; slot_id: number }[]): Promise<TimetableTimeConflict[]> {
		if (selections.length === 0) return []

		// Fetch slot details
		const slotIds = selections.map(s => s.slot_id)
		const slots = await mysql
			.selectFrom(`${CourseTimetableSlotTable._table} as s`)
			.innerJoin(`${CourseTimetableUnitTable._table} as u`, 's.timetable_unit_id', 'u.id')
			.innerJoin(`${CourseTable._table} as c`, 'u.course_id', 'c.id')
			.select(['s.id as slot_id', 's.day', 's.time_from_minutes', 's.time_to_minutes', 'c.id as course_id', 'c.ident as course_ident'])
			.where('s.id', 'in', slotIds)
			.execute()

		const conflicts: TimetableTimeConflict[] = []

		// Check each pair for overlap
		for (let i = 0; i < slots.length; i++) {
			for (let j = i + 1; j < slots.length; j++) {
				const a = slots[i]
				const b = slots[j]

				if (a.day === b.day && this.timesOverlap(a.time_from_minutes!, a.time_to_minutes!, b.time_from_minutes!, b.time_to_minutes!)) {
					conflicts.push({
						day: a.day!,
						time_from: a.time_from_minutes!,
						time_to: a.time_to_minutes!,
						course_id: a.course_id,
						course_ident: a.course_ident,
						slot_id: a.slot_id
					})
					conflicts.push({
						day: b.day!,
						time_from: b.time_from_minutes!,
						time_to: b.time_to_minutes!,
						course_id: b.course_id,
						course_ident: b.course_ident,
						slot_id: b.slot_id
					})
				}
			}
		}

		return conflicts
	}

	/**
	 * Finds non-conflicting alternative slots for a specific course given the current schedule.
	 */
	static async suggestAlternatives(courseId: number, currentSlots: TimetableSlot[], limit = 5): Promise<CourseTimetableUnitWithSlots[]> {
		// Fetch all units and slots for the course
		const units = await mysql.selectFrom(`${CourseTimetableUnitTable._table} as u`).selectAll('u').where('u.course_id', '=', courseId).execute()

		const unitIds = units.map(u => u.id)
		const slots = await mysql.selectFrom(`${CourseTimetableSlotTable._table} as s`).selectAll('s').where('s.timetable_unit_id', 'in', unitIds).execute()

		// Build units with slots
		const unitsWithSlots: CourseTimetableUnitWithSlots[] = units.map(unit => ({
			...unit,
			slots: slots.filter(s => s.timetable_unit_id === unit.id)
		}))

		// Filter out conflicting units
		const nonConflicting = unitsWithSlots.filter(unit => {
			return unit.slots.every(slot => {
				return !currentSlots.some(
					current =>
						current.day === slot.day &&
						slot.time_from_minutes &&
						slot.time_to_minutes &&
						this.timesOverlap(current.time_from, current.time_to, slot.time_from_minutes, slot.time_to_minutes)
				)
			})
		})

		return nonConflicting.slice(0, limit)
	}

	/**
	 * Statistical analysis of a timetable.
	 * Identifies:
	 * - Load by day (hours/count)
	 * - Uncomfortable gaps (>30min)
	 * - Warnings (unbalanced days, early/late classes)
	 */
	static analyzeTimetable(slots: TimetableSlot[]): {
		byDay: Record<string, { count: number; hours: number }>
		gaps: { day: string; from: number; to: number; duration: number }[]
		suggestions: string[]
	} {
		const byDay: Record<string, { count: number; hours: number; slots: TimetableSlot[] }> = {
			Po: { count: 0, hours: 0, slots: [] },
			Út: { count: 0, hours: 0, slots: [] },
			St: { count: 0, hours: 0, slots: [] },
			Čt: { count: 0, hours: 0, slots: [] },
			Pá: { count: 0, hours: 0, slots: [] }
		}

		// Group by day
		for (const slot of slots) {
			if (byDay[slot.day]) {
				byDay[slot.day].count++
				byDay[slot.day].hours += (slot.time_to - slot.time_from) / 60
				byDay[slot.day].slots.push(slot)
			}
		}

		// Find gaps
		const gaps: { day: string; from: number; to: number; duration: number }[] = []

		for (const [day, data] of Object.entries(byDay)) {
			if (data.slots.length < 2) continue

			const sorted = data.slots.sort((a, b) => a.time_from - b.time_from)
			for (let i = 0; i < sorted.length - 1; i++) {
				const gapStart = sorted[i].time_to
				const gapEnd = sorted[i + 1].time_from
				const duration = gapEnd - gapStart

				if (duration > 30) {
					// More than 30 min gap
					gaps.push({ day, from: gapStart, to: gapEnd, duration })
				}
			}
		}

		// Generate suggestions
		const suggestions: string[] = []

		// Check for unbalanced days
		const hoursByDay = Object.values(byDay).map(d => d.hours)
		const maxHours = Math.max(...hoursByDay)
		const minHours = Math.min(...hoursByDay.filter(h => h > 0))

		if (maxHours - minHours > 4) {
			suggestions.push('Rozvrh je nevyvážený - zkuste přesunout některé předměty na méně vytížené dny')
		}

		// Check for long gaps
		const longGaps = gaps.filter(g => g.duration > 90)
		if (longGaps.length > 0) {
			suggestions.push(`Máte ${longGaps.length} dlouhé mezery (>90 min) v rozvrhu`)
		}

		// Check for early/late classes
		const earlySlots = slots.filter(s => s.time_from < 9 * 60)
		const lateSlots = slots.filter(s => s.time_to > 18 * 60)

		if (earlySlots.length > 3) {
			suggestions.push('Máte mnoho ranních hodin - zvažte pozdější alternativy')
		}
		if (lateSlots.length > 2) {
			suggestions.push('Máte hodiny pozdě večer - zvažte dřívější alternativy')
		}

		return {
			byDay: Object.fromEntries(Object.entries(byDay).map(([k, v]) => [k, { count: v.count, hours: v.hours }])),
			gaps,
			suggestions
		}
	}

	/**
	 * Heuristic slot selection.
	 * Scores available slots based on:
	 * - Preferences (Day/Time)
	 * - Capacity (Higher capacity = better score)
	 * - Conflicts (Must be zero)
	 */
	private static selectBestSlot(
		course: CourseWithRelations,
		currentSlots: TimetableSlot[],
		options: {
			preferredDays?: string[]
			preferredTimeFrom?: number
			preferredTimeTo?: number
		}
	): { slot: TimetableSlot | null; conflict: TimetableTimeConflict | null; reason: string } {
		const allSlots: {
			unit: Partial<CourseTimetableUnitWithSlots>
			slot: Partial<CourseTimetableSlot>
			score: number
		}[] = []

		// Score all available slots
		for (const unit of course.timetable_units) {
			if (!unit.slots) continue

			for (const slot of unit.slots) {
				if (!slot.day || !slot.time_from_minutes || !slot.time_to_minutes) continue

				let score = 100

				// Prefer specified days
				if (options.preferredDays?.length) {
					if (options.preferredDays.includes(slot.day)) {
						score += 20
					} else {
						score -= 10
					}
				}

				// Prefer time range
				if (options.preferredTimeFrom !== undefined) {
					if (slot.time_from_minutes >= options.preferredTimeFrom) {
						score += 10
					} else {
						score -= 20
					}
				}
				if (options.preferredTimeTo !== undefined) {
					if (slot.time_to_minutes <= options.preferredTimeTo) {
						score += 10
					} else {
						score -= 20
					}
				}

				// Prefer higher capacity (more chance of getting in)
				if (unit.capacity) {
					score += Math.min(unit.capacity / 10, 20)
				}

				// Check for conflicts
				const hasConflict = currentSlots.some(
					current => current.day === slot.day && this.timesOverlap(current.time_from, current.time_to, slot.time_from_minutes!, slot.time_to_minutes!)
				)

				if (!hasConflict) {
					allSlots.push({ unit, slot, score })
				}
			}
		}

		// Sort by score and return best
		allSlots.sort((a, b) => b.score - a.score)

		if (allSlots.length > 0) {
			const best = allSlots[0]
			return {
				slot: {
					course_id: course.id,
					course_ident: course.ident,
					unit_id: best.unit.id ?? -1,
					slot_id: best.slot.id ?? -1,
					day: best.slot.day!,
					time_from: best.slot.time_from_minutes!,
					time_to: best.slot.time_to_minutes!,
					location: best.slot.location ?? null,
					lecturer: best.unit.lecturer ?? null
				},
				conflict: null,
				reason: ''
			}
		}

		// All slots conflict
		if (course.timetable_units.length > 0) {
			const firstSlot = course.timetable_units?.[0]?.slots?.[0]

			return {
				slot: null,
				conflict: {
					day: firstSlot?.day ?? 'unknown',
					time_from: firstSlot?.time_from_minutes ?? 0,
					time_to: firstSlot?.time_to_minutes ?? 0,
					course_id: course.id,
					course_ident: course.ident,
					slot_id: firstSlot?.id ?? 0
				},
				reason: 'All available time slots conflict with already selected courses'
			}
		}

		return {
			slot: null,
			conflict: null,
			reason: 'No timetable slots available for this course'
		}
	}

	private static timesOverlap(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
		return aFrom < bTo && aTo > bFrom
	}
}
