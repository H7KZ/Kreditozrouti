import type { CourseUnitType } from '@kreditozrouti/types'

export function getSlotType(slot: { type?: string | null }): CourseUnitType {
	const slotType = slot.type?.toLowerCase() ?? ''
	if (slotType.includes('přednáška') || slotType.includes('lecture')) return 'lecture'
	if (slotType.includes('cvičení') || slotType.includes('exercise')) return 'exercise'
	if (slotType.includes('seminář') || slotType.includes('seminar')) return 'seminar'
	return 'lecture'
}
