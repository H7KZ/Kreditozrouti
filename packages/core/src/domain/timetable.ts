import type { Campus, CourseUnitType, ScheduledCourseUnit, ScheduledUnit, TimeSelection } from '@kreditozrouti/types'
import { DayValues } from '@kreditozrouti/types'
import { getDayFromDate } from './day.js'

/** Minimum travel time in minutes required between the two VŠE campuses. */
export const CAMPUS_TRAVEL_MINUTES = 40

/**
 * Determine which VŠE campus a room location string belongs to.
 */
export function getCampus(location: string | null | undefined): Campus {
	if (!location) return 'unknown'
	const prefix = (location.trim().split(/[.\-\s]/)[0] ?? '').toUpperCase()
	if (['JM'].includes(prefix)) return 'jizni-mesto'
	if (['RB', 'NB', 'IB', 'SB'].includes(prefix)) return 'zizkov'
	return 'unknown'
}

/**
 * Returns true when two scheduled units overlap in time on the same day.
 */
export function unitsConflict(a: ScheduledUnit, b: ScheduledUnit): boolean {
	const aDay = a.day ?? (a.date ? getDayFromDate(a.date) : null)
	const bDay = b.day ?? (b.date ? getDayFromDate(b.date) : null)
	if (!aDay || !bDay || aDay !== bDay) return false
	if (a.date && b.date && a.date !== b.date) return false
	return a.timeFrom < b.timeTo && b.timeFrom < a.timeTo
}

/**
 * Returns true when two scheduled units are on different campuses and the gap
 * between them is less than CAMPUS_TRAVEL_MINUTES, making cross-campus travel
 * physically impossible. Hard overlaps are excluded.
 */
export function unitsCampusConflict(a: ScheduledUnit, b: ScheduledUnit): boolean {
	const aDay = a.day ?? (a.date ? getDayFromDate(a.date) : null)
	const bDay = b.day ?? (b.date ? getDayFromDate(b.date) : null)
	if (!aDay || !bDay || aDay !== bDay) return false
	if (a.date && b.date && a.date !== b.date) return false
	if (unitsConflict(a, b)) return false
	const aCampus = getCampus(a.location)
	const bCampus = getCampus(b.location)
	if (aCampus === 'unknown' || bCampus === 'unknown') return false
	if (aCampus === bCampus) return false
	const gap = Math.max(a.timeFrom, b.timeFrom) - Math.min(a.timeTo, b.timeTo)
	return gap >= 0 && gap < CAMPUS_TRAVEL_MINUTES
}

/**
 * Checks whether all required unit types for a course are covered by the
 * selected units, using the snapshotted available types stored in each unit.
 */
export function checkCourseCompleteness(units: ScheduledCourseUnit[]): {
	isIncomplete: boolean
	missingTypes: CourseUnitType[]
} {
	const first = units[0]
	if (!first?.snapshotAvailableTypes || first.snapshotAvailableTypes.length === 0) {
		return { isIncomplete: false, missingTypes: [] }
	}
	const availableTypes = new Set<CourseUnitType>(first.snapshotAvailableTypes)
	const selectedTypes = new Set(units.map(u => u.unitType))
	const missingTypes: CourseUnitType[] = []
	for (const type of availableTypes) {
		if (!selectedTypes.has(type)) missingTypes.push(type)
	}
	return { isIncomplete: missingTypes.length > 0 && selectedTypes.size > 0, missingTypes }
}

/**
 * Comparator for sorting TimeSelection objects by day index, then start time,
 * then end time. Used to produce deterministic cache keys.
 */
export function compareTimeSelections(a: TimeSelection, b: TimeSelection): number {
	const toDateStr = (d: string | Date | undefined | null): string | null | undefined => {
		if (!(d instanceof Date)) return d
		const yyyy = d.getFullYear()
		const mm = String(d.getMonth() + 1).padStart(2, '0')
		const dd = String(d.getDate()).padStart(2, '0')
		return `${yyyy}-${mm}-${dd}`
	}
	const aDay = a.day ?? getDayFromDate(toDateStr(a.date))
	const bDay = b.day ?? getDayFromDate(toDateStr(b.date))
	if (!aDay && !bDay) return 0
	if (!aDay) return -1
	if (!bDay) return 1
	const aDayIndex = DayValues.indexOf(aDay)
	const bDayIndex = DayValues.indexOf(bDay)
	if (aDayIndex !== bDayIndex) return aDayIndex - bDayIndex
	if (a.time_from !== b.time_from) return a.time_from - b.time_from
	return a.time_to - b.time_to
}
