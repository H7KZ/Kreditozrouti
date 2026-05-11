import type { CourseUnitSlot } from '@api/contracts'
import type { CourseUnitType, SelectedCourseUnit } from '@client/types'
import { getDayFromDate } from '@client/utils/day'

// Campus detection

const JM_PREFIXES = ['JM']
const ZIZKOV_PREFIXES = ['RB', 'NB', 'IB', 'SB']

/** Minimum travel time in minutes required between the two campuses. */
export const CAMPUS_TRAVEL_MINUTES = 40

/** VŠE campus identifier. */
export type Campus = 'jizni-mesto' | 'zizkov' | 'unknown'

/**
 * Determine which VŠE campus a room location string belongs to.
 *
 * Jižní Město rooms are prefixed with "JM" (e.g. "JM.28", "JM-A101").
 * Žižkov rooms are prefixed with "RB", "NB", "IB", or "SB" (e.g. "NB.169").
 *
 * @param location - Room location string from a slot, e.g. "NB.169"
 * @returns Campus identifier or 'unknown' when it cannot be determined.
 */
export function getCampus(location: string | null | undefined): Campus {
	if (!location) return 'unknown'
	const prefix = (location.trim().split(/[.\-\s]/)[0] ?? '').toUpperCase()
	if (JM_PREFIXES.includes(prefix)) return 'jizni-mesto'
	if (ZIZKOV_PREFIXES.includes(prefix)) return 'zizkov'
	return 'unknown'
}

/**
 * Returns true when two SelectedCourseUnits are on different campuses and
 * the gap between them is less than CAMPUS_TRAVEL_MINUTES, making travel
 * between campuses physically impossible.
 *
 * This is a softer "campus conflict" — the slots do not overlap in time but
 * are too close together for cross-campus travel. Hard time overlaps (handled
 * by `unitsConflict`) are excluded.
 */
export function unitsCampusConflict(a: SelectedCourseUnit, b: SelectedCourseUnit): boolean {
	// Must be on the same day
	const aDay = a.day ?? (a.date ? getDayFromDate(a.date) : null)
	const bDay = b.day ?? (b.date ? getDayFromDate(b.date) : null)
	if (!aDay || !bDay || aDay !== bDay) return false
	if (a.date && b.date && a.date !== b.date) return false

	// Must not already be a hard time overlap (handled by unitsConflict)
	if (unitsConflict(a, b)) return false

	// Check campus difference
	const aCampus = getCampus(a.location)
	const bCampus = getCampus(b.location)
	if (aCampus === 'unknown' || bCampus === 'unknown') return false
	if (aCampus === bCampus) return false

	// Gap = start of later unit minus end of earlier unit
	const gap = Math.max(a.timeFrom, b.timeFrom) - Math.min(a.timeTo, b.timeTo)
	return gap >= 0 && gap < CAMPUS_TRAVEL_MINUTES
}

/**
 * Returns true when two SelectedCourseUnits overlap in time on the same day.
 */
export function unitsConflict(a: SelectedCourseUnit, b: SelectedCourseUnit): boolean {
	const aDay = a.day ?? (a.date ? getDayFromDate(a.date) : null)
	const bDay = b.day ?? (b.date ? getDayFromDate(b.date) : null)
	if (!aDay || !bDay || aDay !== bDay) return false
	if (a.date && b.date && a.date !== b.date) return false
	return a.timeFrom < b.timeTo && b.timeFrom < a.timeTo
}

/**
 * Checks whether all required unit types for a course are covered by the
 * selected units, using the snapshotted available types stored in each unit.
 *
 * The `getSlotType` parameter is kept for call-site compatibility but is not
 * used — type information comes from `snapshotAvailableTypes`.
 */
export function checkCourseCompleteness(
	units: SelectedCourseUnit[],
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_getSlotType?: (slot: CourseUnitSlot) => CourseUnitType,
): { isIncomplete: boolean; missingTypes: CourseUnitType[] } {
	const first = units[0]
	if (!first?.snapshotAvailableTypes || first.snapshotAvailableTypes.length === 0) {
		return { isIncomplete: false, missingTypes: [] }
	}

	const availableTypes = new Set<CourseUnitType>(first.snapshotAvailableTypes)
	const selectedTypes = new Set(units.map((u) => u.unitType))
	const missingTypes: CourseUnitType[] = []
	for (const type of availableTypes) {
		if (!selectedTypes.has(type)) missingTypes.push(type)
	}

	return { isIncomplete: missingTypes.length > 0 && selectedTypes.size > 0, missingTypes }
}
