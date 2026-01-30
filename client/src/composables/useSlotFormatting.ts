import type { CourseUnitSlot } from '@api/Database/types'
import { useCourseLabels, useTimeUtils } from '@client/composables'
import { i18n } from '@client/index.ts'
import { getDayFromDate, parseDateString } from '@client/utils/day.ts'

/**
 * Slot formatting composable.
 *
 * @example
 * ```ts
 * const { formatSlotInfo, formatSlotTime, formatSlotLocation } = useSlotFormatting()
 *
 * // "Po 09:00 - 10:30"
 * const info = formatSlotInfo(slot)
 * ```
 */
export function useSlotFormatting() {
	const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})
	const { formatTimeRange } = useTimeUtils()
	const { getShortDayLabel } = useCourseLabels()

	/**
	 * Format complete slot information for display.
	 *
	 * Combines day, date (if applicable), and time range.
	 * Examples:
	 * - "Po 09:00 - 10:30" (recurring slot)
	 * - "St 15.03.2024 14:00 - 15:30" (block/single-occurrence slot)
	 *
	 * @param slot - The slot to format
	 * @returns Formatted slot info string
	 */
	function formatSlotInfo(slot: CourseUnitSlot): string {
		const parts: string[] = []

		// Day from recurring schedule
		if (slot.day) {
			parts.push(getShortDayLabel(slot.day))
		}

		// Date for block/single-occurrence slots
		if (slot.date) {
			const date = parseDateString(slot.date)

			// Add day from date if we don't have a recurring day
			if (!slot.day) {
				const dateDay = getDayFromDate(slot.date)
				if (dateDay) {
					parts.push(getShortDayLabel(dateDay))
				}
			}

			// Add formatted date
			if (date) {
				parts.push(date.toLocaleDateString())
			}
		}

		// Time range
		const time = formatTimeRange(slot.time_from, slot.time_to)
		parts.push(time)

		return parts.join(' ')
	}

	/**
	 * Format just the day portion of a slot.
	 *
	 * @param slot - The slot to format
	 * @returns Day label or '-' if no day info
	 */
	function formatSlotDay(slot: CourseUnitSlot): string {
		if (slot.day) {
			return getShortDayLabel(slot.day)
		}

		if (slot.date) {
			const dateDay = getDayFromDate(slot.date)
			if (dateDay) {
				return getShortDayLabel(dateDay)
			}
		}

		return '-'
	}

	/**
	 * Format just the time portion of a slot.
	 *
	 * @param slot - The slot to format
	 * @returns Time range string
	 */
	function formatSlotTime(slot: CourseUnitSlot): string {
		return formatTimeRange(slot.time_from, slot.time_to)
	}

	/**
	 * Format the location of a slot.
	 *
	 * @param slot - The slot to format
	 * @returns Location string or '-' if not available
	 */
	function formatSlotLocation(slot: CourseUnitSlot): string {
		return slot.location || '-'
	}

	/**
	 * Format slot date for block courses.
	 *
	 * @param slot - The slot to format
	 * @returns Formatted date or null if no date
	 */
	function formatSlotDate(slot: CourseUnitSlot): string | null {
		if (!slot.date) return null

		const date = parseDateString(slot.date)
		return date ? date.toLocaleDateString() : slot.date
	}

	/**
	 * Check if a slot is a block/single-occurrence slot (has date, no recurring day).
	 */
	function isBlockSlot(slot: CourseUnitSlot): boolean {
		return !!slot.date && !slot.day
	}

	/**
	 * Check if a slot is a recurring slot (has day, no specific date).
	 */
	function isRecurringSlot(slot: CourseUnitSlot): boolean {
		return !!slot.day && !slot.date
	}

	/**
	 * Get a short summary of slots for a course row.
	 * Shows unique days sorted by week order.
	 *
	 * @param slots - Array of slots
	 * @returns Summary like "Po, St, Pá" or "-" if no slots
	 */
	function formatSlotsSummary(slots: CourseUnitSlot[]): string {
		if (!slots || slots.length === 0) return '-'

		const daysSet = new Set<string>()

		for (const slot of slots) {
			const day = slot.day ?? getDayFromDate(slot.date)
			if (day) {
				daysSet.add(getShortDayLabel(day))
			}
		}

		if (daysSet.size === 0) return '-'

		return Array.from(daysSet).join(', ')
	}

	/**
	 * Format capacity information.
	 *
	 * @param capacity - Number of available seats
	 * @returns Formatted capacity string with translation
	 */
	function formatCapacity(capacity: number | null | undefined): string {
		if (capacity == null) return ''
		return `${capacity} ${t('common.seats')}`
	}

	/**
	 * Get CSS class for capacity display based on availability.
	 */
	function getCapacityClass(capacity: number | null | undefined): string {
		if (capacity == null) return ''
		return capacity > 0 ? 'text-[var(--insis-success)]' : 'text-[var(--insis-danger)]'
	}

	return {
		formatSlotInfo,
		formatSlotDay,
		formatSlotTime,
		formatSlotLocation,
		formatSlotDate,
		isBlockSlot,
		isRecurringSlot,
		formatSlotsSummary,
		formatCapacity,
		getCapacityClass,
	}
}
