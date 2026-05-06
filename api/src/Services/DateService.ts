import InSISDay, { InSISDayValues } from '@scraper/Types/InSISDay'

class DateService {
	/**
	 * Parse a date string in DD.MM.YYYY format and extract the day of the week.
	 *
	 * @param date - Date string in DD.MM.YYYY format
	 * @returns The day of the week or null if invalid
	 */
	static getDayFromDate(date: Date): InSISDay | null {
		try {
			if (isNaN(date.getTime())) return null

			const jsDay = date.getDay()
			// Convert: Sunday (0) -> 6, Monday (1) -> 0, etc.
			const dayIndex = jsDay === 0 ? 6 : jsDay - 1

			return InSISDayValues[dayIndex] ?? null
		} catch {
			return null
		}
	}
}

export default DateService
