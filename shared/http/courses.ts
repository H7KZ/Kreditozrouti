import type { InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from '../domain/insis.js'
import type { TimeSelection } from '../domain/time.js'

export interface CoursesFilter {
	ids?: number[]
	idents?: string[]
	title?: string
	search?: string
	semesters?: InSISSemester[]
	years?: number[]
	faculty_ids?: string[]
	levels?: string[]
	languages?: string[]
	include_times?: TimeSelection[]
	exclude_times?: TimeSelection[]
	lecturers?: string[]
	study_plan_ids?: number[]
	groups?: InSISStudyPlanCourseGroup[]
	categories?: InSISStudyPlanCourseCategory[]
	ects?: number[]
	mode_of_completions?: string[]
	mode_of_deliveries?: string[]
	completed_course_idents?: string[]
	sort_by: 'ident' | 'title' | 'ects' | 'faculty' | 'year' | 'semester'
	sort_dir: 'asc' | 'desc'
	limit: number
	offset: number
}
