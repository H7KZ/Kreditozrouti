import type { CourseUnitType, Day, InSISSemester } from './domain.js'

export interface MCPFaculty {
	id: string
	title: string | null
}

export interface MCPCourseUnitSlot {
	id: number
	unit_id: number
	type: CourseUnitType | null
	frequency: 'weekly' | 'single' | null
	date: string | null
	day: Day | null
	time_from: number | null
	time_to: number | null
	location: string | null
}

export interface MCPCourseUnit {
	id: number
	course_id: number
	lecturer: string | null
	capacity: number | null
	note: string | null
	slots: MCPCourseUnitSlot[]
}

export interface MCPCourseAssessment {
	id: number
	course_id: number
	method: string | null
	method_en: string | null
	weight: number | null
}

export interface MCPCourse {
	id: number
	faculty_id: string | null
	ident: string
	title: string | null
	title_cs: string | null
	title_en: string | null
	aims_of_the_course: string | null
	aims_of_the_course_en: string | null
	learning_outcomes: string | null
	learning_outcomes_en: string | null
	course_contents: string | null
	course_contents_en: string | null
	literature_required: string | null
	literature_recommended: string | null
	special_requirements: string | null
	ects: number | null
	mode_of_delivery: string | null
	mode_of_completion: string | null
	languages: string | null
	level: string | null
	year_of_study: number | null
	semester: InSISSemester | null
	year: number | null
	faculty: { id: string; title: string | null } | null
	units: MCPCourseUnit[]
	assessments: MCPCourseAssessment[]
	study_plans: { id: number; study_plan_id: number; course_ident: string; group: string | null; category: string | null }[]
}

export interface CourseFilter {
	ids?: number[]
	idents?: string[]
	search?: string
	faculty_ids?: string[]
	semesters?: string[]
	years?: number[]
	ects_min?: number
	ects_max?: number
	levels?: string[]
	languages?: string[]
	study_plan_ids?: number[]
}

export interface MCPStudyPlanCourse {
	course_ident: string
	group: string | null
	category: string | null
}

export interface MCPStudyPlan {
	id: number
	faculty_id: string | null
	ident: string | null
	title: string | null
	year: number | null
	semester: string | null
	courses?: MCPStudyPlanCourse[]
}
