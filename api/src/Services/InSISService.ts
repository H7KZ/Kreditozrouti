import InSISSemester from '@scraper/Types/InSISSemester'

/**
 * Utility service for calculating academic periods based on dates.
 * Used for determining current semesters and generating historical options.
 */
export default class InSISService {
	/**
	 * Determines the upcoming or current semester based on a specific date.
	 *
	 * Rules:
	 * - Jan/Feb: Upcoming is Summer Semester (LS) of previous year context (e.g. Feb 2024 -> LS 2023).
	 * - Aug/Sep: Upcoming is Winter Semester (ZS) of current year.
	 * - Other months return null (undefined period logic).
	 */
	static getUpcomingPeriod(date: Date = new Date()): { semester: InSISSemester; year: number } | null {
		const month = date.getMonth() + 1
		const year = date.getFullYear()

		if (month >= 1 && month <= 2) {
			return { semester: 'LS', year: year - 1 }
		}

		if (month >= 8 && month <= 9) {
			return { semester: 'ZS', year }
		}

		return null
	}

	/**
	 * Generates a list of academic periods for the last N years from a given date.
	 * Useful for populating "Semester" dropdowns in filters.
	 */
	static getPeriodsForLastYears(yearsBack = 4, date: Date = new Date()): { semester: InSISSemester; year: number }[] {
		const upcomingPeriod = this.getUpcomingPeriod(date)
		if (!upcomingPeriod) return []

		const periods: { semester: InSISSemester; year: number }[] = []
		let currentYear = upcomingPeriod.year
		let currentSemester = upcomingPeriod.semester
		const totalPeriods = yearsBack * 2

		for (let i = 0; i < totalPeriods; i++) {
			periods.push({ semester: currentSemester, year: currentYear })

			if (currentSemester === 'ZS') {
				currentSemester = 'LS'
			} else {
				currentSemester = 'ZS'
				currentYear--
			}
		}

		return periods
	}
}
