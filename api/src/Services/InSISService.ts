import { getPeriodsForLastYears, getUpcomingPeriod } from '@shared/domain/period'

export { getUpcomingPeriod, getPeriodsForLastYears }

// Default export maintains class-shape for callers using InSISService.getUpcomingPeriod()
export default class InSISService {
	static getUpcomingPeriod = getUpcomingPeriod
	static getPeriodsForLastYears = getPeriodsForLastYears
}
