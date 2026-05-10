import type { InSISSemester } from '../domain/insis.js'

export interface StudyPlansFilter {
	ids?: number[]
	idents?: string[]
	title?: string
	semesters?: InSISSemester[]
	years?: number[]
	faculty_ids?: string[]
	levels?: string[]
	mode_of_studies?: string[]
	study_lengths?: string[]
	has_course_ids?: number[]
	has_course_idents?: string[]
	sort_by: 'ident' | 'title' | 'faculty_id' | 'year' | 'semester' | 'level'
	sort_dir: 'asc' | 'desc'
	limit: number
	offset: number
}

export interface StudyPlanCoursesFilter {
	study_plan_ids: number[]
}
