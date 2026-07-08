export const DayValues = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type Day = (typeof DayValues)[number]

export const CourseUnitTypeValues = ['lecture', 'exercise', 'seminar'] as const
export type CourseUnitType = (typeof CourseUnitTypeValues)[number]

export const InSISSemesterValues = ['LS', 'ZS'] as const
export type InSISSemester = (typeof InSISSemesterValues)[number]

export interface TimeSelection {
	slot_id?: number
	day?: Day | null
	date?: Date | null
	time_from: number
	time_to: number
}

export const InSISDayValues = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'] as const
export type InSISDay = (typeof InSISDayValues)[number]

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

export type ScraperJob =
	| 'InSIS:Catalog'
	| 'InSIS:Course'
	| 'InSIS:StudyPlans'
	| 'InSIS:StudyPlan'
	| 'InSIS:AcademicSchedules'
	| 'InSIS:AcademicSchedule'
	| 'InSIS:FacultyTimetables'
	| 'InSIS:FacultyTimetable'
	| 'InSIS:GapSweep'

export type Campus = 'jizni-mesto' | 'zizkov' | 'unknown'

export interface ScheduledUnit {
	day?: Day
	date?: string
	timeFrom: number
	timeTo: number
	location?: string
}

export interface ScheduledCourseUnit {
	unitType: CourseUnitType
	snapshotAvailableTypes?: CourseUnitType[]
}

export type AssessmentBucketKey = 'final_test' | 'oral_exam' | 'ongoing_tests' | 'paper_project' | 'presentation' | 'activity'
