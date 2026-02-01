import type { CourseUnit, CourseUnitSlot } from '@api/Database/types'
import { DAYS_ORDER } from '@client/constants/timetable.ts'
import { i18n } from '@client/index.ts'
import { getDayFromDate, getDayIndex } from '@client/utils/day.ts'
import type InSISDay from '@scraper/Types/InSISDay'

/**
 * Schedule summary composable.
 *
 * @example
 * ```ts
 * const { getScheduleSummary, getUniqueDaysFromUnits } = useScheduleSummary()
 *
 * const summary = getScheduleSummary(course.units) // "Po, St, Pá"
 * ```
 */
export function useScheduleSummary() {
	const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

	/**
	 * Get unique days from an array of course units.
	 * Handles both recurring slots (with day) and block slots (with date).
	 */
	function getUniqueDaysFromUnits(units: CourseUnit<void, CourseUnitSlot>[] | undefined): Set<InSISDay> {
		const daysSet = new Set<InSISDay>()

		if (!units || units.length === 0) return daysSet

		for (const unit of units) {
			if (unit.slots) {
				for (const slot of unit.slots) {
					// For recurring slots with day
					if (slot.day) {
						daysSet.add(slot.day)
					}
					// For block/single-occurrence slots with date, extract the day
					else if (slot.date) {
						const dateDay = getDayFromDate(slot.date)
						if (dateDay) {
							daysSet.add(dateDay)
						}
					}
				}
			}
		}

		return daysSet
	}

	/**
	 * Get schedule summary for a course.
	 * Shows days sorted by week order (Mon-Sun).
	 *
	 * @param units - Course units with slots
	 * @returns Formatted string like "Po, St, Pá" or "-" if no schedule
	 */
	function getScheduleSummary(units: CourseUnit<void, CourseUnitSlot>[] | undefined): string {
		const daysSet = getUniqueDaysFromUnits(units)

		if (daysSet.size === 0) return '-'

		// Sort days by week order and get short names
		const sortedDays = Array.from(daysSet)
			.sort((a, b) => getDayIndex(a) - getDayIndex(b))
			.map((day) => t(`daysShort.${day}`))

		return sortedDays.join(', ')
	}

	/**
	 * Get schedule summary with full day names.
	 *
	 * @param units - Course units with slots
	 * @returns Formatted string like "Monday, Wednesday, Friday"
	 */
	function getScheduleSummaryFull(units: CourseUnit<void, CourseUnitSlot>[] | undefined): string {
		const daysSet = getUniqueDaysFromUnits(units)

		if (daysSet.size === 0) return '-'

		const sortedDays = Array.from(daysSet)
			.sort((a, b) => getDayIndex(a) - getDayIndex(b))
			.map((day) => t(`days.${day}`))

		return sortedDays.join(', ')
	}

	/**
	 * Get time range summary for a course.
	 * Shows earliest start and latest end time.
	 *
	 * @param units - Course units with slots
	 * @returns Formatted string like "09:00 - 17:30" or "-" if no times
	 */
	function getTimeRangeSummary(units: CourseUnit<void, CourseUnitSlot>[] | undefined): string {
		if (!units || units.length === 0) return '-'

		let minTime = Infinity
		let maxTime = -Infinity

		for (const unit of units) {
			if (unit.slots) {
				for (const slot of unit.slots) {
					if (slot.time_from !== null && slot.time_from !== undefined) {
						minTime = Math.min(minTime, slot.time_from)
					}
					if (slot.time_to !== null && slot.time_to !== undefined) {
						maxTime = Math.max(maxTime, slot.time_to)
					}
				}
			}
		}

		if (minTime === Infinity || maxTime === -Infinity) return '-'

		const formatTime = (minutes: number) => {
			const hours = Math.floor(minutes / 60)
			const mins = minutes % 60
			return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
		}

		return `${formatTime(minTime)} - ${formatTime(maxTime)}`
	}

	/**
	 * Check if a course has block/date-only slots.
	 */
	function hasBlockSlots(units: CourseUnit<void, CourseUnitSlot>[] | undefined): boolean {
		if (!units) return false

		return units.some((unit) => unit.slots?.some((slot) => slot.date && !slot.day))
	}

	/**
	 * Check if a course has recurring slots.
	 */
	function hasRecurringSlots(units: CourseUnit<void, CourseUnitSlot>[] | undefined): boolean {
		if (!units) return false

		return units.some((unit) => unit.slots?.some((slot) => slot.day))
	}

	return {
		getUniqueDaysFromUnits,
		getScheduleSummary,
		getScheduleSummaryFull,
		getTimeRangeSummary,
		hasBlockSlots,
		hasRecurringSlots,
		DAYS_ORDER,
	}
}
