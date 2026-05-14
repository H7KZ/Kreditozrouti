import type { CourseUnitType } from '@shared/domain/insis'

export { getSlotType } from '@shared/domain/insis'

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
