import { CourseUnitType } from '@client/types'
import type { CourseUnitSlot } from '../../../api/src/Contracts'

/**
 * Get slot type from a course unit slot.
 * Determines if the slot is a lecture, exercise, or seminar
 * based on the slot's type field (matches Czech and English DB strings).
 *
 * This is a pure utility — no i18n dependency.
 *
 * @param slot - Course unit slot
 * @returns CourseUnitType ('lecture' | 'exercise' | 'seminar')
 */
export function getSlotType(slot: CourseUnitSlot): CourseUnitType {
	const slotType = slot.type?.toLowerCase() || ''

	const hasLecture = slotType.includes('přednáška') || slotType.includes('lecture')
	const hasExercise = slotType.includes('cvičení') || slotType.includes('exercise')
	const hasSeminar = slotType.includes('seminář') || slotType.includes('seminar')

	if (hasLecture) return 'lecture'
	if (hasExercise) return 'exercise'
	if (hasSeminar) return 'seminar'

	return 'lecture' // Default to lecture
}

/**
 * Get Tailwind/CSS color class for a unit type.
 *
 * @param type - Course unit type
 * @returns CSS class string
 */
export function getUnitTypeColorClass(type: CourseUnitType): string {
	const colors: Record<CourseUnitType, string> = {
		lecture: 'bg-[var(--insis-block-lecture)]',
		exercise: 'bg-[var(--insis-block-exercise)]',
		seminar: 'bg-[var(--insis-block-seminar)]',
	}
	return colors[type] || colors.lecture
}

/**
 * Get badge CSS class for a course category.
 *
 * @param category - Course category string ('compulsory' | 'elective' | other)
 * @returns CSS class string
 */
export function getCategoryBadgeClass(category: string): string {
	switch (category) {
		case 'compulsory':
			return 'insis-badge-compulsory'
		case 'elective':
			return 'insis-badge-elective'
		default:
			return 'insis-badge-other'
	}
}
