import type { ColumnType, Generated, Selectable } from 'kysely'

export interface FacultyTable {
	id: string
	title: string | null
}

export interface CourseTable {
	id: Generated<number>
	faculty_id: string | null
	ident: string
	title: string | null
	title_cs: string | null
	title_en: string | null
	annotation: string | null
	annotation_cs: string | null
	annotation_en: string | null
	requirements: string | null
	requirements_cs: string | null
	requirements_en: string | null
	literature: string | null
	literature_cs: string | null
	literature_en: string | null
	ects: number | null
	mode_of_delivery: string | null
	mode_of_completion: string | null
	languages: string | null
	level: string | null
	year_of_study: number | null
	semester: string | null
	year: number | null
	updated_at: ColumnType<Date, never, never>
}

export interface CourseAssessmentTable {
	id: Generated<number>
	course_id: number
	type: string | null
	title: string | null
	title_cs: string | null
	title_en: string | null
	points_required: number | null
	points_total: number | null
}

export interface CourseUnitTable {
	id: Generated<number>
	course_id: number
	lecturer: string | null
	capacity: number | null
	note: string | null
}

export interface CourseUnitSlotTable {
	id: Generated<number>
	unit_id: number
	type: string | null
	frequency: string | null
	date: string | null
	day: string | null
	time_from: number | null
	time_to: number | null
	location: string | null
}

export interface StudyPlanTable {
	id: Generated<number>
	faculty_id: string | null
	ident: string
	title: string | null
	year: number | null
	semester: string | null
}

export interface StudyPlanCourseTable {
	id: Generated<number>
	study_plan_id: number
	course_ident: string
	group: string | null
	category: string | null
}

export interface DB {
	insis_faculties: FacultyTable
	insis_courses: CourseTable
	insis_courses_assessments: CourseAssessmentTable
	insis_courses_units: CourseUnitTable
	insis_courses_units_slots: CourseUnitSlotTable
	insis_study_plans: StudyPlanTable
	insis_study_plans_courses: StudyPlanCourseTable
}

export type Faculty = Selectable<FacultyTable>
export type Course = Selectable<CourseTable>
export type CourseAssessment = Selectable<CourseAssessmentTable>
export type CourseUnit = Selectable<CourseUnitTable>
export type CourseUnitSlot = Selectable<CourseUnitSlotTable>
export type StudyPlan = Selectable<StudyPlanTable>
export type StudyPlanCourse = Selectable<StudyPlanCourseTable>
