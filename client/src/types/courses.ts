/**
 * Frontend types for the Courses API
 * Derived from backend types in @api/Controllers/Kreditozrouti/types
 */

// Re-export enums and base types that are shared
export type InSISSemester = 'WS' | 'SS'
export type InSISDay = 'Po' | 'Út' | 'St' | 'Čt' | 'Pá' | 'So' | 'Ne'
export type InSISStudyPlanCourseGroup = 'c' | 'cv' | 'v'
export type InSISStudyPlanCourseCategory = string

export interface FacetItem {
	value: string | number | null
	count: number
}

export interface Faculty {
	id: string
	title: string | null
	created_at: string
	updated_at: string
}

export interface CourseUnitSlot {
	id: number
	unit_id: number
	type: string | null
	frequency: 'weekly' | 'single' | null
	date: string | null
	day: InSISDay | null
	time_from: number | null
	time_to: number | null
	location: string | null
	created_at: string
	updated_at: string
}

export interface CourseUnit {
	id: number
	course_id: number
	lecturer: string | null
	capacity: number | null
	note: string | null
	slots: CourseUnitSlot[]
	created_at: string
	updated_at: string
}

export interface CourseAssessment {
	id: number
	course_id: number
	method: string | null
	weight: number | null
	created_at: string
	updated_at: string
}

export interface StudyPlanCourse {
	id: number
	study_plan_id: number
	course_id: number | null
	course_ident: string
	group: InSISStudyPlanCourseGroup
	category: InSISStudyPlanCourseCategory
	created_at: string
	updated_at: string
}

export interface Course {
	id: number
	faculty_id: string | null
	url: string
	ident: string
	title: string | null
	czech_title: string | null
	ects: number | null
	mode_of_delivery: string | null
	mode_of_completion: string | null
	languages: string | null
	level: string | null
	year_of_study: number | null
	semester: InSISSemester | null
	year: number | null
	lecturers: string | null
	prerequisites: string | null
	recommended_programmes: string | null
	required_work_experience: string | null
	aims_of_the_course: string | null
	learning_outcomes: string | null
	course_contents: string | null
	special_requirements: string | null
	literature: string | null
	created_at: string
	updated_at: string
	faculty: Partial<Faculty> | null
	units: CourseUnit[]
	assessments: CourseAssessment[]
	study_plans: StudyPlanCourse[]
}

export interface CoursesFilter {
	id?: number | number[]
	ident?: string | string[]
	semester?: InSISSemester
	year?: number
	faculty_id?: string | string[]
	day?: InSISDay | InSISDay[]
	time_from?: number
	time_to?: number
	study_plan_id?: number
	group?: InSISStudyPlanCourseGroup[]
	category?: string[]
	lecturer?: string | string[]
	language?: string | string[]
	level?: string | string[]
	ects?: number | number[]
	mode_of_completion?: string | string[]
	search?: string
	limit?: number
	offset?: number
}

export interface CoursesFacets {
	faculties: FacetItem[]
	days: FacetItem[]
	lecturers: FacetItem[]
	languages: FacetItem[]
	levels: FacetItem[]
	semesters: FacetItem[]
	years: FacetItem[]
	groups: FacetItem[]
	categories: FacetItem[]
	ects: FacetItem[]
	modes_of_completion: FacetItem[]
	time_range: { min_time: number; max_time: number }
}

export interface CoursesResponse {
	data: Course[]
	facets: CoursesFacets
	meta: {
		limit: number
		offset: number
		count: number
		total: number
	}
}

// Helper to convert minutes from midnight to HH:MM format
export function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Helper to convert HH:MM to minutes from midnight
export function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(':').map(Number)
	return hours * 60 + minutes
}

// Day labels for display
export const DAY_LABELS: Record<InSISDay, { short: string; full: string }> = {
	Po: { short: 'Po', full: 'Pondělí' },
	Út: { short: 'Út', full: 'Úterý' },
	St: { short: 'St', full: 'Středa' },
	Čt: { short: 'Čt', full: 'Čtvrtek' },
	Pá: { short: 'Pá', full: 'Pátek' },
	So: { short: 'So', full: 'Sobota' },
	Ne: { short: 'Ne', full: 'Neděle' },
}

export const WEEKDAYS: InSISDay[] = ['Po', 'Út', 'St', 'Čt', 'Pá']
export const ALL_DAYS: InSISDay[] = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

// Course group labels
export const GROUP_LABELS: Record<InSISStudyPlanCourseGroup, string> = {
	c: 'Povinný',
	cv: 'Povinně volitelný',
	v: 'Volitelný',
}
