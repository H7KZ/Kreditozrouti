import type { CourseUnitSlot } from '@api/contracts'
import { DAYS_ORDER } from '@client/constants/timetable.ts'
import { compareDateStrings, getDayFromDate, parseDateString } from '@shared/domain/day'
import type { InSISDay } from '@shared/domain/insis'

export { compareDateStrings, getDayFromDate, parseDateString }

export function getSlotDay(slot: CourseUnitSlot): InSISDay | null {
	return slot.day ?? (slot.date ? getDayFromDate(slot.date) : null)
}

export function getDayIndex(day: InSISDay | null | undefined): number {
	if (!day) return 999
	const index = DAYS_ORDER.indexOf(day)
	return index === -1 ? 999 : index
}
