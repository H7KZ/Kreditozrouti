import type { TimeSelection } from '@api/Validations'
import { TIME_CONFIG } from '@client/constants/timetable.ts'
import { i18n } from '@client/index.ts'

/**
 * Time utilities composable.
 *
 * @example
 * ```ts
 * const { formatTimeRange, minutesToTime, timeToMinutes } = useTimeUtils()
 *
 * const time = minutesToTime(540) // "09:00"
 * const minutes = timeToMinutes("09:00") // 540
 * const range = formatTimeRange(540, 630) // "09:00 - 10:30"
 * ```
 */
export function useTimeUtils() {
	const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

	/**
	 * Convert minutes from midnight to HH:MM format.
	 *
	 * @param minutes - Minutes from midnight (0-1440)
	 * @returns Time string in HH:MM format
	 */
	function minutesToTime(minutes: number | null | undefined): string {
		if (minutes == null) return '--:--'

		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
	}

	/**
	 * Convert HH:MM format to minutes from midnight.
	 *
	 * @param time - Time string in HH:MM format
	 * @returns Minutes from midnight
	 */
	function timeToMinutes(time: string): number {
		const [hours, mins] = time.split(':').map(Number)
		return (hours ?? 0) * 60 + (mins ?? 0)
	}

	/**
	 * Utility: Format time from minutes to HH:MM
	 */
	function formatTime(minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
	}

	/**
	 * Format a time range for display.
	 *
	 * @param from - Start time in minutes
	 * @param to - End time in minutes
	 * @returns Formatted time range string
	 */
	function formatTimeRange(from: number | null | undefined, to: number | null | undefined): string {
		return `${minutesToTime(from)} - ${minutesToTime(to)}`
	}

	/**
	 * Format a time selection (day + time range) for display.
	 *
	 * @param selection - Time selection object
	 * @returns Formatted string like "Po 09:00 - 10:30"
	 */
	function formatTimeSelection(selection: TimeSelection): string {
		const dayKey = `daysShort.${selection.day}`
		const dayLabel = t(dayKey)
		return `${dayLabel} ${formatTimeRange(selection.time_from, selection.time_to)}`
	}

	/**
	 * Calculate the horizontal position (left %) for a time on the grid.
	 *
	 * @param time - Time in minutes from midnight
	 * @param start - Grid start time in minutes (default: TIME_CONFIG.START)
	 * @param end - Grid end time in minutes (default: TIME_CONFIG.END)
	 * @returns Percentage position (0-100)
	 */
	function calculateTimePosition(time: number, start = TIME_CONFIG.START, end = TIME_CONFIG.END): number {
		const totalDuration = end - start
		const position = ((time - start) / totalDuration) * 100
		return Math.max(0, Math.min(100, position))
	}

	/**
	 * Calculate the width (%) for a time duration on the grid.
	 *
	 * @param from - Start time in minutes
	 * @param to - End time in minutes
	 * @param start - Grid start time in minutes (default: TIME_CONFIG.START)
	 * @param end - Grid end time in minutes (default: TIME_CONFIG.END)
	 * @returns Width as percentage (0-100)
	 */
	function calculateTimeDuration(from: number, to: number, start = TIME_CONFIG.START, end = TIME_CONFIG.END): number {
		const totalDuration = end - start
		const duration = ((to - from) / totalDuration) * 100
		return Math.max(0, Math.min(100, duration))
	}

	/**
	 * Generate time slot options for select inputs.
	 *
	 * @param interval - Interval between options in minutes (default: 15)
	 * @param start - Start time in minutes (default: TIME_CONFIG.START)
	 * @param end - End time in minutes (default: TIME_CONFIG.END)
	 * @returns Array of time options
	 */
	function generateTimeOptions(interval = 15, start = TIME_CONFIG.START, end = TIME_CONFIG.END): Array<{ value: string; label: string }> {
		const options: Array<{ value: string; label: string }> = []

		for (let mins = start; mins <= end; mins += interval) {
			const time = minutesToTime(mins)
			options.push({ value: time, label: time })
		}

		return options
	}

	/**
	 * Generate time slots for the timetable grid header.
	 *
	 * @param interval - Interval between slots in minutes (default: 60 for hourly)
	 * @returns Array of time slot objects
	 */
	function generateTimeSlots(interval = 60): Array<{ minutes: number; label: string }> {
		const slots: Array<{ minutes: number; label: string }> = []
		let time = TIME_CONFIG.START

		while (time <= TIME_CONFIG.END) {
			slots.push({
				minutes: time,
				label: minutesToTime(time),
			})
			time += interval
		}

		return slots
	}

	/**
	 * Snap a time to the nearest interval.
	 *
	 * @param time - Time in minutes
	 * @param interval - Snap interval in minutes (default: 15)
	 * @returns Snapped time in minutes
	 */
	function snapToInterval(time: number, interval = 15): number {
		return Math.round(time / interval) * interval
	}

	/**
	 * Clamp a time to the valid range.
	 *
	 * @param time - Time in minutes
	 * @returns Clamped time within TIME_CONFIG bounds
	 */
	function clampTime(time: number): number {
		return Math.max(TIME_CONFIG.START, Math.min(TIME_CONFIG.END, time))
	}

	/**
	 * Check if two time ranges overlap.
	 *
	 * @param aFrom - First range start
	 * @param aTo - First range end
	 * @param bFrom - Second range start
	 * @param bTo - Second range end
	 * @returns True if ranges overlap
	 */
	function timeRangesOverlap(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
		return aFrom < bTo && bFrom < aTo
	}

	return {
		minutesToTime,
		timeToMinutes,
		formatTime,
		formatTimeRange,
		formatTimeSelection,
		calculateTimePosition,
		calculateTimeDuration,
		generateTimeOptions,
		generateTimeSlots,
		snapToInterval,
		clampTime,
		timeRangesOverlap,
	}
}
