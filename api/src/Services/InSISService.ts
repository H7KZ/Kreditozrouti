import { getPeriodsForLastYears, getUpcomingPeriod } from '@kreditozrouti/core/domain'

export { getUpcomingPeriod, getPeriodsForLastYears }

// Default export maintains class-shape for callers using InSISService.getUpcomingPeriod()
export default class InSISService {
	static getUpcomingPeriod = getUpcomingPeriod
	static getPeriodsForLastYears = getPeriodsForLastYears
}
