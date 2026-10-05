import type { CourseUnitType, Day, InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from './domain.js'

/**
 * Public contract of the partner API (`/v1`). These shapes are a promise to consumers: internal table and
 * DTO shapes may change, these may only change additively within a major version.
 *
 * Conventions: snake_case fields, times as `HH:MM`, dates as ISO 8601, lists as real arrays (never pipe-delimited).
 */

export interface PublicPage<T> {
	data: T[]
	meta: { total: number; limit: number; offset: number }
}

export interface PublicLecturerRef {
	/** InSIS person id (`/lide/clovek.pl?id=`). Stable across periods. */
	id: number
	name: string
	role: 'lecturer' | 'guarantor'
}

export interface PublicSlot {
	type: CourseUnitType | null
	frequency: 'weekly' | 'single' | null
	day: Day | null
	/** Set for one-off slots. */
	date: string | null
	time_from: string | null
	time_to: string | null
	location: string | null
}

export interface PublicUnit {
	id: number
	/** Display name only: InSIS publishes no person link for unit-level lecturers. Omitted without the `lecturers:read` scope. */
	lecturer?: string | null
	capacity: number | null
	note: string | null
	slots: PublicSlot[]
}

export interface PublicCourse {
	id: number
	ident: string
	title: string | null
	title_cs: string | null
	title_en: string | null
	ects: number | null
	faculty_id: string | null
	year: number | null
	semester: InSISSemester | null
	level: string | null
	year_of_study: number | null
	languages: string[]
	mode_of_delivery: string | null
	mode_of_completion: string | null
	url: string
	/** Course-level lecturers and guarantors. Omitted without the `lecturers:read` scope. */
	lecturers?: PublicLecturerRef[]
	units: PublicUnit[]
	last_scraped_at: string | null
}

export interface PublicCourseDetail extends PublicCourse {
	prerequisites: string | null
	prerequisites_en: string | null
	aims_of_the_course: string | null
	aims_of_the_course_en: string | null
	learning_outcomes: string | null
	learning_outcomes_en: string | null
	course_contents: string | null
	course_contents_en: string | null
	special_requirements: string | null
	special_requirements_en: string | null
	literature_required: string | null
	literature_required_en: string | null
	literature_recommended: string | null
	literature_recommended_en: string | null
	assessments: { method: string | null; method_en: string | null; weight: number | null }[]
	prerequisite_idents: {
		blocked_by: string[]
		excluded_after: string[]
		concurrent_exclusion: string[]
		recommended_before: string[]
	}
}

export interface PublicLecturer {
	id: number
	name: string
}

export interface PublicLecturerCourseRef {
	id: number
	ident: string
	title: string | null
	year: number | null
	semester: InSISSemester | null
	role: 'lecturer' | 'guarantor'
}

export interface PublicLecturerDetail extends PublicLecturer {
	courses: PublicLecturerCourseRef[]
}

export interface PublicFaculty {
	id: string
	title: string | null
}

export interface PublicPeriod {
	faculty_id: string
	year: number
	semester: InSISSemester | null
	level: string | null
	starts_at: string
	ends_at: string
}

export interface PublicStudyPlan {
	id: number
	ident: string | null
	title: string | null
	faculty_id: string | null
	year: number | null
	semester: InSISSemester | null
	level: string | null
	mode_of_study: string | null
	study_length: string | null
}

export interface PublicStudyPlanDetail extends PublicStudyPlan {
	courses: { ident: string; group: InSISStudyPlanCourseGroup; category: InSISStudyPlanCourseCategory }[]
}
