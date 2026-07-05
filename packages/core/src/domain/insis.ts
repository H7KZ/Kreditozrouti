export type {
	InSISDay,
	InSISSemester,
	InSISStudyPlanCourseCategory,
	InSISStudyPlanCourseGroup,
	ScraperJob
} from '@kreditozrouti/types'

export {
	InSISDayValues,
	InSISSemesterValues,
	InSISStudyPlanCourseCategoryValues,
	InSISStudyPlanCourseGroupValues,
	CourseUnitTypeValues
} from '@kreditozrouti/types'

export type { CourseUnitType } from '@kreditozrouti/types'

/**
 * Normalises a raw InSIS slot type string to a CourseUnitType.
 * Matches Czech and English InSIS vocabulary (case-insensitive).
 * Defaults to 'lecture' when the string matches nothing.
 */
export function getSlotType(slot: { type?: string | null }): import('@kreditozrouti/types').CourseUnitType {
	const slotType = slot.type?.toLowerCase() ?? ''
	if (slotType.includes('přednáška') || slotType.includes('lecture')) return 'lecture'
	if (slotType.includes('cvičení') || slotType.includes('exercise')) return 'exercise'
	if (slotType.includes('seminář') || slotType.includes('seminar')) return 'seminar'
	return 'lecture'
}
