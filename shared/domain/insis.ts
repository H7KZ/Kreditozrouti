export const InSISDayValues = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'] as const

export type InSISDay = (typeof InSISDayValues)[number]

export const InSISSemesterValues = ['LS', 'ZS'] as const

export type InSISSemester = (typeof InSISSemesterValues)[number]

export const InSISStudyPlanCourseCategoryValues = [
	'compulsory',
	'elective',
	'language',
	'state_exam',
	'prohibited',
	'beyond_scope',
	'exchange_program',
	'physical_education'
] as const

export type InSISStudyPlanCourseCategory = (typeof InSISStudyPlanCourseCategoryValues)[number]

export const InSISStudyPlanCourseGroupValues = [
	'faculty_specific',
	'university_wide',
	'field_specific_bachelor',
	'field_specific_master',
	'minor_specialization'
] as const

export type InSISStudyPlanCourseGroup = (typeof InSISStudyPlanCourseGroupValues)[number]

export type ScraperJob = 'InSIS:Catalog' | 'InSIS:Course' | 'InSIS:StudyPlans' | 'InSIS:StudyPlan'

export type CourseUnitType = 'lecture' | 'exercise' | 'seminar'

/**
 * Normalises a raw InSIS slot type string to a CourseUnitType.
 * Matches Czech and English InSIS vocabulary (case-insensitive).
 * Defaults to 'lecture' when the string matches nothing.
 */
export function getSlotType(slot: { type?: string | null }): CourseUnitType {
	const slotType = slot.type?.toLowerCase() || ''
	if (slotType.includes('přednáška') || slotType.includes('lecture')) return 'lecture'
	if (slotType.includes('cvičení') || slotType.includes('exercise')) return 'exercise'
	if (slotType.includes('seminář') || slotType.includes('seminar')) return 'seminar'
	return 'lecture'
}
