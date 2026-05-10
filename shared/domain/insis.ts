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
