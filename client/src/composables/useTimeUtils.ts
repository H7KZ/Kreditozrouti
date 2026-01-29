import { TimeSelection } from '@api/Validations'
import { ALL_DAYS } from '@client/constants/timetable.ts'
import { i18n } from '@client/index.ts'
import InSISDay from '@scraper/Types/InSISDay.ts'

const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

/** Days in week order (Monday = 0, Sunday = 6) */
export const DAYS_ORDER: InSISDay[] = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle']

/**
 * Time Utilities Composable
 * Provides helper functions for working with InSIS time formats.
 */
export function useTimeUtils() {
	/**
	 * Convert minutes from midnight to HH:MM format
	 */
	function minutesToTime(minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
	}

	/**
	 * Convert HH:MM string to minutes from midnight
	 */
	function timeToMinutes(time: string): number {
		const [hours, mins] = time.split(':').map(Number)
		if (hours === undefined || mins === undefined) return 0
		if (isNaN(hours) || isNaN(mins)) return 0
		if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return 0
		return hours * 60 + mins
	}

	/**
	 * Get InSIS day from date string (DD.MM.YYYY)
	 */
	function getDayFromDate(dateStr: string): InSISDay | undefined {
		const date = new Date(dateStr.split('.').reverse().join('-')) // Convert DD.MM.YYYY to YYYY-MM-DD
		return ALL_DAYS[date.getDay()] // 0 (Sun) to 6 (Sat)
	}

	/**
	 * Format a time range
	 */
	function formatTimeRange(from: number | null, to: number | null): string {
		if (from === null || to === null) return '-'
		return `${minutesToTime(from)} - ${minutesToTime(to)}`
	}

	/**
	 * Format a TimeSelection for display
	 */
	function formatTimeSelection(selection: TimeSelection): string {
		const dayShort = t(`daysShort.${selection.day}`)
		return `${dayShort} ${formatTimeRange(selection.time_from, selection.time_to)}`
	}

	/**
	 * Get day index (0-6, Pondělí = 0)
	 */
	function getDayIndex(day: InSISDay): number {
		return DAYS_ORDER.indexOf(day)
	}

	/**
	 * Sort days in week order
	 */
	function sortDays(days: InSISDay[]): InSISDay[] {
		return [...days].sort((a, b) => getDayIndex(a) - getDayIndex(b))
	}

	/**
	 * Check if two time ranges overlap
	 */
	function doTimesOverlap(a: { from: number; to: number }, b: { from: number; to: number }): boolean {
		return a.from < b.to && b.from < a.to
	}

	/**
	 * Generate time slot labels for a grid (e.g., 7:30, 8:15, 9:00, ...)
	 */
	function generateTimeLabels(start: number, end: number, slotDuration: number, breakDuration: number): Array<{ minutes: number; label: string }> {
		const labels: Array<{ minutes: number; label: string }> = []
		let time = start

		while (time < end) {
			labels.push({
				minutes: time,
				label: minutesToTime(time),
			})
			time += slotDuration + breakDuration
		}

		return labels
	}

	/**
	 * Calculate the height/position percentage for a time block in a grid
	 */
	function calculateTimePosition(time: number, gridStart: number, gridEnd: number): number {
		const totalMinutes = gridEnd - gridStart
		const offset = time - gridStart
		return (offset / totalMinutes) * 100
	}

	/**
	 * Calculate the height percentage for a time duration in a grid
	 */
	function calculateTimeDuration(from: number, to: number, gridStart: number, gridEnd: number): number {
		const totalMinutes = gridEnd - gridStart
		const duration = to - from
		return (duration / totalMinutes) * 100
	}

	/**
	 * Parse academic year string (e.g., "2024" -> "2024/2025")
	 */
	function formatAcademicYear(year: number): string {
		return `${year}/${year + 1}`
	}

	/**
	 * Parse semester code to human-readable text
	 * ZS = Zimní semestr (Winter), LS = Letní semestr (Summer)
	 */
	function formatSemester(semester: 'ZS' | 'LS'): string {
		return semester === 'ZS' ? 'Zimní semestr' : 'Letní semestr'
	}

	/**
	 * Format semester with year (e.g., "ZS 2024/2025")
	 */
	function formatSemesterWithYear(semester: 'ZS' | 'LS', year: number): string {
		return `${semester} ${formatAcademicYear(year)}`
	}

	return {
		minutesToTime,
		timeToMinutes,
		getDayFromDate,
		formatTimeRange,
		formatTimeSelection,
		getDayIndex,
		sortDays,
		doTimesOverlap,
		generateTimeLabels,
		calculateTimePosition,
		calculateTimeDuration,
		formatAcademicYear,
		formatSemester,
		formatSemesterWithYear,
		DAYS_ORDER,
	}
}
