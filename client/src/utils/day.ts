import { DAYS_ORDER } from '@client/constants/timetable.ts'
import type InSISDay from '@scraper/Types/InSISDay'

/**
 * Get the sort index for a day (Monday = 0, Sunday = 6).
 * Returns 999 for invalid/null days to sort them at the end.
 *
 * @param day - The day to get the index for
 * @returns The sort index (0-6) or 999 if invalid
 */
export function getDayIndex(day: InSISDay | null | undefined): number {
	if (!day) return 999
	const index = DAYS_ORDER.indexOf(day)
	return index === -1 ? 999 : index
}

/**
 * Parse a date string in DD.MM.YYYY format and extract the day of the week.
 *
 * @param dateStr - Date string in DD.MM.YYYY format
 * @returns The day of the week or null if invalid
 */
export function getDayFromDate(dateStr: string | null | undefined): InSISDay | null {
	if (!dateStr) return null

	try {
		// Convert DD.MM.YYYY to YYYY-MM-DD for Date parsing
		const isoDate = dateStr.split('.').reverse().join('-')
		const date = new Date(isoDate)

		if (isNaN(date.getTime())) return null

		// JavaScript getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
		// Our DAYS_ORDER: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
		const jsDay = date.getDay()
		// Convert: Sunday (0) -> 6, Monday (1) -> 0, etc.
		const dayIndex = jsDay === 0 ? 6 : jsDay - 1

		return DAYS_ORDER[dayIndex] ?? null
	} catch {
		return null
	}
}

/**
 * Parse a date string in DD.MM.YYYY format to a Date object.
 *
 * @param dateStr - Date string in DD.MM.YYYY format
 * @returns Date object or null if invalid
 */
export function parseDateString(dateStr: string): Date | null {
	try {
		const isoDate = dateStr.split('.').reverse().join('-')
		const date = new Date(isoDate)
		return isNaN(date.getTime()) ? null : date
	} catch {
		return null
	}
}

/**
 * Compare two dates in DD.MM.YYYY format.
 *
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareDateStrings(a: string, b: string): number {
	const dateA = parseDateString(a)
	const dateB = parseDateString(b)

	if (!dateA && !dateB) return 0
	if (!dateA) return 1
	if (!dateB) return -1

	return dateA.getTime() - dateB.getTime()
}
