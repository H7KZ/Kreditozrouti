import type {InSISSemester} from './insis.js'

export function getUpcomingPeriod(date: Date = new Date()): { semester: InSISSemester; year: number } {
    const month = date.getMonth() + 1
    const year = date.getFullYear()

    if ([6, 7, 8, 9, 10, 11].includes(month)) return {semester: 'ZS', year}
    if (month === 12) return {semester: 'LS', year}
    return {semester: 'LS', year: year - 1}
}

export function getPeriodsForLastYears(
    yearsBack = 4,
    date: Date = new Date(),
): { semester: InSISSemester; year: number }[] {
    const upcomingPeriod = getUpcomingPeriod(date)
    const periods: { semester: InSISSemester; year: number }[] = []
    let currentYear = upcomingPeriod.year
    let currentSemester = upcomingPeriod.semester
    const totalPeriods = yearsBack * 2

    for (let i = 0; i < totalPeriods; i++) {
        periods.push({semester: currentSemester, year: currentYear})
        if (currentSemester === 'ZS') {
            currentSemester = 'LS'
        } else {
            currentSemester = 'ZS'
            currentYear--
        }
    }

    return periods
}
