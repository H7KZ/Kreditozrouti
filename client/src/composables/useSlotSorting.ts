import type { CourseUnitSlot } from '@api/Database/types'
import { useCourseLabels } from '@client/composables'
import { CourseUnitWithSlots } from '@client/types'
import { compareDateStrings, getDayFromDate, getDayIndex } from '@client/utils/day.ts'
import InSISDay from '@scraper/Types/InSISDay.ts'

/**
 * Slot sorting composable.
 *
 * @example
 * ```ts
 * const { sortSlots, sortUnits } = useSlotSorting()
 *
 * const sortedSlots = sortSlots(unit.slots)
 * const sortedUnits = sortUnits(course.units)
 * ```
 */
export function useSlotSorting() {
	const { getSlotType } = useCourseLabels()

	/**
	 * Get the effective day for a slot (from day field or extracted from date).
	 */
	function getSlotDay(slot: CourseUnitSlot) {
		return slot.day ?? (slot.date ? getDayFromDate(slot.date) : null)
	}

	/**
	 * Sort slots by day, then by date (for block courses), then by time.
	 *
	 * Sorting order:
	 * 1. Day of week (Monday first)
	 * 2. Specific date (for block courses with same day)
	 * 3. Start time
	 * 4. End time (shorter first if same start)
	 *
	 * @param slots - Array of slots to sort
	 * @returns New sorted array (original not mutated)
	 */
	function sortSlots(slots: CourseUnitSlot[]): CourseUnitSlot[] {
		return [...slots].sort((a, b) => {
			// Compare days
			const dayA = getSlotDay(a)
			const dayB = getSlotDay(b)
			const dayIndexA = getDayIndex(dayA)
			const dayIndexB = getDayIndex(dayB)

			if (dayIndexA !== dayIndexB) {
				return dayIndexA - dayIndexB
			}

			// If same day, sort by date (for block courses)
			if (a.date && b.date) {
				const dateComparison = compareDateStrings(a.date, b.date)
				if (dateComparison !== 0) {
					return dateComparison
				}
			}

			// If same day/date, sort by start time
			const timeA = a.time_from ?? 0
			const timeB = b.time_from ?? 0

			if (timeA !== timeB) {
				return timeA - timeB
			}

			// If same start time, sort by end time (shorter first)
			return (a.time_to ?? 0) - (b.time_to ?? 0)
		})
	}

	/**
	 * Sort units by their first slot's day and time.
	 *
	 * @param units - Array of units to sort
	 * @returns New sorted array (original not mutated)
	 */
	function sortUnits(units: CourseUnitWithSlots[]): CourseUnitWithSlots[] {
		return [...units].sort((a, b) => {
			const firstSlotA = sortSlots(a.slots || [])[0]
			const firstSlotB = sortSlots(b.slots || [])[0]

			// Units without slots go to the end
			if (!firstSlotA && !firstSlotB) return 0
			if (!firstSlotA) return 1
			if (!firstSlotB) return -1

			// Compare by first slot's day
			const dayA = getSlotDay(firstSlotA)
			const dayB = getSlotDay(firstSlotB)
			const dayIndexA = getDayIndex(dayA)
			const dayIndexB = getDayIndex(dayB)

			if (dayIndexA !== dayIndexB) {
				return dayIndexA - dayIndexB
			}

			// Compare by first slot's time
			const timeA = firstSlotA.time_from ?? 0
			const timeB = firstSlotB.time_from ?? 0
			return timeA - timeB
		})
	}

	/**
	 * Sort units within each type group.
	 * Maintains type grouping while sorting units within each group.
	 *
	 * @param units - Array of units
	 * @returns Units sorted by type, then by day/time within each type
	 */
	function sortUnitsByType(units: CourseUnitWithSlots[]): CourseUnitWithSlots[] {
		// Group by type first
		const typeOrder: Record<string, number> = {
			lecture: 0,
			exercise: 1,
			seminar: 2,
		}

		return [...units].sort((a, b) => {
			// Get primary type of each unit (from first slot)
			const typeA = a.slots?.[0] ? getSlotType(a.slots[0]) : 'lecture'
			const typeB = b.slots?.[0] ? getSlotType(b.slots[0]) : 'lecture'

			const typeOrderA = typeOrder[typeA] ?? 3
			const typeOrderB = typeOrder[typeB] ?? 3

			if (typeOrderA !== typeOrderB) {
				return typeOrderA - typeOrderB
			}

			// Same type, sort by day/time
			const firstSlotA = sortSlots(a.slots || [])[0]
			const firstSlotB = sortSlots(b.slots || [])[0]

			if (!firstSlotA && !firstSlotB) return 0
			if (!firstSlotA) return 1
			if (!firstSlotB) return -1

			const dayA = getSlotDay(firstSlotA)
			const dayB = getSlotDay(firstSlotB)
			const dayIndexDiff = getDayIndex(dayA) - getDayIndex(dayB)

			if (dayIndexDiff !== 0) return dayIndexDiff

			return (firstSlotA.time_from ?? 0) - (firstSlotB.time_from ?? 0)
		})
	}

	/**
	 * Get a unique set of days from all slots in units.
	 * Returns days sorted in chronological order.
	 *
	 * @param units - Array of units
	 * @returns Sorted array of unique days
	 */
	function getUniqueDays(units: CourseUnitWithSlots[]) {
		const daysSet = new Set<InSISDay>()

		for (const unit of units) {
			for (const slot of unit.slots ?? []) {
				const day = getSlotDay(slot)
				if (day) daysSet.add(day)
			}
		}

		return Array.from(daysSet).sort((a, b) => getDayIndex(a) - getDayIndex(b))
	}

	return {
		getSlotDay,
		sortSlots,
		sortUnits,
		sortUnitsByType,
		getUniqueDays,
	}
}
