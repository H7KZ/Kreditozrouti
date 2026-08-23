import type { SelectedCourseUnit } from '@client/types'
import type { CourseWithRelationsDTO, Day } from '@kreditozrouti/types'
import { unitsConflict } from '@kreditozrouti/core/domain/timetable'

const GAP_THRESHOLD = 15 // minutes

export interface FitResult {
	courseId: number
	/** -Infinity = all slots conflict with timetable (course cannot fit) */
	score: number
	fitReason: 'fills_gap' | 'same_day' | 'new_day' | 'neutral'
}

/** The two positive fit cases worth a labelled chip in the course list. */
export type FitChip = 'fills_gap' | 'same_day'

/**
 * Maps a fit reason to the chip to show, or null for no chip. Only the two
 * positive cases (gap-filler, same-day) get a chip; neutral, new-day, and
 * no-fit (whose reason is 'neutral') show nothing, so a chip reliably means
 * "worth a look". Pure and side-effect free; the row component is thin glue.
 */
export function fitChipFor(reason: FitResult['fitReason']): FitChip | null {
	return reason === 'fills_gap' || reason === 'same_day' ? reason : null
}

export function computeFitScore(course: CourseWithRelationsDTO, timetableUnits: SelectedCourseUnit[]): FitResult {
	const timetableDays = new Set<Day>(timetableUnits.map(u => u.day).filter((d): d is Day => d != null))

	let best = -Infinity
	let bestReason: FitResult['fitReason'] = 'neutral'

	for (const unit of course.units ?? []) {
		for (const slot of unit.slots ?? []) {
			if (slot.time_from == null || slot.time_to == null) continue

			const candidate = {
				day: slot.day as Day | undefined,
				date: slot.date ?? undefined,
				timeFrom: slot.time_from,
				timeTo: slot.time_to
			}

			const conflicts = timetableUnits.some(tu =>
				unitsConflict(candidate, {
					day: tu.day,
					date: tu.date,
					timeFrom: tu.timeFrom,
					timeTo: tu.timeTo
				})
			)
			if (conflicts) continue

			const slotDay = slot.day as Day | undefined
			let score = 0
			let reason: FitResult['fitReason'] = 'neutral'

			if (slotDay && timetableDays.has(slotDay)) {
				score = 20
				reason = 'same_day'
				const fillsGap = timetableUnits.some(
					tu =>
						tu.day === slotDay && (Math.abs(slot.time_from! - tu.timeTo) <= GAP_THRESHOLD || Math.abs(tu.timeFrom - slot.time_to!) <= GAP_THRESHOLD)
				)
				if (fillsGap) {
					score = 50
					reason = 'fills_gap'
				}
			} else if (slotDay) {
				score = -15
				reason = 'new_day'
			}

			if (score > best) {
				best = score
				bestReason = reason
			}
		}
	}

	return { courseId: course.id, score: best, fitReason: bestReason }
}

export function computeFitScores(courses: CourseWithRelationsDTO[], timetableUnits: SelectedCourseUnit[]): Map<number, FitResult> {
	const map = new Map<number, FitResult>()
	for (const course of courses) map.set(course.id, computeFitScore(course, timetableUnits))
	return map
}
