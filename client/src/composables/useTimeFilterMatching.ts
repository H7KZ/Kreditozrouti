import type { CourseUnitSlot } from '@api/Database/types'
import type { TimeSelection } from '@api/Validations'
import { useTimeUtils } from '@client/composables'
import { useCoursesStore } from '@client/stores'
import { CourseUnitWithSlots } from '@client/types'
import { getDayFromDate } from '@client/utils/day.ts'
import { computed } from 'vue'

/**
 * Time filter matching composable.
 *
 * @example
 * ```ts
 * const { hasActiveTimeFilter, slotMatchesTimeFilter, unitMatchesTimeFilter } = useTimeFilterMatching()
 *
 * // In template:
 * // :class="{ highlighted: slotMatchesTimeFilter(slot) }"
 * ```
 */
export function useTimeFilterMatching() {
	const coursesStore = useCoursesStore()
	const { timeRangesOverlap } = useTimeUtils()

	/**
	 * Check if there are any active time filters.
	 */
	const hasActiveTimeFilter = computed((): boolean => {
		return (coursesStore.filters.include_times?.length ?? 0) > 0
	})

	/**
	 * Get active time inclusion filters.
	 */
	const activeTimeFilters = computed((): TimeSelection[] => {
		return coursesStore.filters.include_times ?? []
	})

	/**
	 * Get active time exclusion filters.
	 */
	const activeExcludeFilters = computed((): TimeSelection[] => {
		return coursesStore.filters.exclude_times ?? []
	})

	/**
	 * Total count of active time filters (include + exclude).
	 */
	const activeTimeFilterCount = computed((): number => {
		return (coursesStore.filters.include_times?.length ?? 0) + (coursesStore.filters.exclude_times?.length ?? 0)
	})

	/**
	 * Get the effective day for a slot.
	 */
	function getSlotDay(slot: CourseUnitSlot) {
		return slot.day ?? (slot.date ? getDayFromDate(slot.date) : null)
	}

	/**
	 * Check if a slot matches any of the active time inclusion filters.
	 *
	 * A slot matches if:
	 * - Its day matches the filter's day
	 * - Its time range overlaps with the filter's time range
	 *
	 * @param slot - The slot to check
	 * @returns True if the slot matches at least one filter
	 */
	function slotMatchesTimeFilter(slot: CourseUnitSlot): boolean {
		if (!hasActiveTimeFilter.value) return false

		const slotDay = getSlotDay(slot)
		const slotFrom = slot.time_from
		const slotTo = slot.time_to

		if (!slotDay || slotFrom == null || slotTo == null) return false

		return activeTimeFilters.value.some((filter) => {
			// Check if day matches
			if (filter.day !== slotDay) return false

			// Check if time ranges overlap
			const filterFrom = filter.time_from ?? 0
			const filterTo = filter.time_to ?? 1440

			return timeRangesOverlap(slotFrom, slotTo, filterFrom, filterTo)
		})
	}

	/**
	 * Check if a slot matches any of the active time exclusion filters.
	 *
	 * @param slot - The slot to check
	 * @returns True if the slot should be excluded
	 */
	function slotMatchesExcludeFilter(slot: CourseUnitSlot): boolean {
		if (activeExcludeFilters.value.length === 0) return false

		const slotDay = getSlotDay(slot)
		const slotFrom = slot.time_from
		const slotTo = slot.time_to

		if (!slotDay || slotFrom == null || slotTo == null) return false

		return activeExcludeFilters.value.some((filter) => {
			if (filter.day !== slotDay) return false

			const filterFrom = filter.time_from ?? 0
			const filterTo = filter.time_to ?? 1440

			return timeRangesOverlap(slotFrom, slotTo, filterFrom, filterTo)
		})
	}

	/**
	 * Check if any slot in a unit matches the active time filters.
	 *
	 * @param unit - The unit to check
	 * @returns True if at least one slot matches
	 */
	function unitMatchesTimeFilter(unit: CourseUnitWithSlots): boolean {
		if (!hasActiveTimeFilter.value) return false

		for (const slot of unit.slots ?? []) {
			if (slotMatchesTimeFilter(slot)) {
				return true
			}
		}

		return false
	}

	/**
	 * Check if all slots in a unit match the active time filters.
	 *
	 * @param unit - The unit to check
	 * @returns True if all slots match
	 */
	function unitFullyMatchesTimeFilter(unit: CourseUnitWithSlots): boolean {
		if (!hasActiveTimeFilter.value) return false

		const slots = unit.slots ?? []
		if (slots.length === 0) return false

		return slots.every((slot) => slotMatchesTimeFilter(slot))
	}

	/**
	 * Count how many slots in a unit match the active time filters.
	 *
	 * @param unit - The unit to check
	 * @returns Number of matching slots
	 */
	function countMatchingSlots(unit: CourseUnitWithSlots): number {
		if (!hasActiveTimeFilter.value) return 0

		return (unit.slots ?? []).filter((slot) => slotMatchesTimeFilter(slot)).length
	}

	/**
	 * Get CSS class for slot highlighting based on unit type.
	 *
	 * @param slot - The slot to get highlighting class for
	 * @param slotType - The type of the slot (lecture, exercise, seminar)
	 * @returns CSS class string or empty string
	 */
	function getSlotHighlightClass(slot: CourseUnitSlot, slotType: 'lecture' | 'exercise' | 'seminar'): string {
		if (!slotMatchesTimeFilter(slot)) return ''

		const classes: Record<string, string> = {
			lecture: 'bg-[var(--insis-block-lecture)]!',
			exercise: 'bg-[var(--insis-block-exercise)]!',
			seminar: 'bg-[var(--insis-block-seminar)]!',
		}

		return classes[slotType] ?? ''
	}

	return {
		// State
		hasActiveTimeFilter,
		activeTimeFilters,
		activeExcludeFilters,
		activeTimeFilterCount,

		// Slot matchers
		slotMatchesTimeFilter,
		slotMatchesExcludeFilter,

		// Unit matchers
		unitMatchesTimeFilter,
		unitFullyMatchesTimeFilter,
		countMatchingSlots,

		// Utilities
		getSlotHighlightClass,
	}
}
