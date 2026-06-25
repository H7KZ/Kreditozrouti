import type { Day } from '@shared/domain/constants'
import type { CourseUnitSlotDTO } from '@shared/http/responses'
import { INSIS_DAY_NORM } from '@shared/domain/constants'
import { compareDateStrings, getDayFromDate, parseDateString } from '@shared/domain/day'
import { DAYS_ORDER } from '@client/constants/timetable.ts'

export { compareDateStrings, getDayFromDate, parseDateString }

export function getSlotDay(slot: CourseUnitSlotDTO): Day | null {
	return slot.day ?? (slot.date ? getDayFromDate(slot.date) : null)
}

// TEMP: migrate old InSIS Czech day strings to canonical Day values — remove after 2026-07-25
export function migrateLegacyDay(day: string | null | undefined): Day | undefined {
	if (!day) return undefined
	return (INSIS_DAY_NORM[day] ?? day) as Day
}

export function getDayIndex(day: Day | null | undefined): number {
	if (!day) return 999
	const index = DAYS_ORDER.indexOf(day)
	return index === -1 ? 999 : index
}
