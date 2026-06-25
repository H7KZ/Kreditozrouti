import type { Day } from '@shared/domain/constants'
import type { CourseUnitSlotDTO } from '@shared/http/responses'
import { compareDateStrings, getDayFromDate, parseDateString } from '@shared/domain/day'
import { DAYS_ORDER } from '@client/constants/timetable.ts'

export { compareDateStrings, getDayFromDate, parseDateString }

export function getSlotDay(slot: CourseUnitSlotDTO): Day | null {
	return slot.day ?? (slot.date ? getDayFromDate(slot.date) : null)
}

export function getDayIndex(day: Day | null | undefined): number {
	if (!day) return 999
	const index = DAYS_ORDER.indexOf(day)
	return index === -1 ? 999 : index
}
