import type { CourseUnitSlot } from '@api/Database/types'
import type { CourseUnitType, SelectedCourseUnit } from '@client/types'
import { getDayFromDate } from '@client/utils/day'

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
