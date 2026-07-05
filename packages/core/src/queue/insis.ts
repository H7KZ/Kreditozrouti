import type { InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from '../domain/insis.js'

export interface ScraperInSISFaculty {
	ident: string | null
	title: string | null
}

export interface ScraperInSISCourseStudyLoad {
	activity: string
	hours: string | null
}

export interface ScraperInSISCatalog {
	urls: string[]
}

export interface ScraperInSISCourse {
	id: number
	url: string
	url_id: number | null
	ident: string | null
	title: string | null
	title_cs: string | null
	title_en: string | null
	ects: string | null
	faculty: ScraperInSISFaculty | null
	mode_of_delivery: string | null
	mode_of_completion: string | null
	languages: string | null
	level: string | null
	year_of_study: string | null
	period: string | null
	lecturers: string | null
	guarantors: string | null
	prerequisites: string | null
	recommended_programmes: string | null
	required_work_experience: string | null
	aims_of_the_course: string | null
	learning_outcomes: string | null
	course_contents: string | null
	assessment_methods: ScraperInSISCourseAssessmentMethod[] | null
	special_requirements: string | null
	literature_required: string | null
	literature_recommended: string | null
	aims_of_the_course_en: string | null
	learning_outcomes_en: string | null
	course_contents_en: string | null
	special_requirements_en: string | null
	literature_required_en: string | null
	literature_recommended_en: string | null
	prerequisites_en: string | null
	recommended_programmes_en: string | null
	required_work_experience_en: string | null
	last_modified_date: string | null
	last_modified_by: string | null
	study_load: ScraperInSISCourseStudyLoad[] | null
	timetable: ScraperInSISCourseTimetableUnit[] | null
	study_plans: ScraperInSISCourseStudyPlan[] | null
	content_hash_cs: string | null
	content_hash_en: string | null
}

export interface ScraperInSISCourseAssessmentMethod {
	method: string | null
	method_en: string | null
	weight: string | null
}

export interface ScraperInSISCourseTimetableUnit {
	lecturer: string | null
	capacity: number | null
	note: string | null
	slots: ScraperInSISCourseTimetableSlot[] | null
}

export interface ScraperInSISCourseTimetableSlot {
	type: string | null
	frequency: string | null
	date: string | null
	day: string | null
	time_from: string | null
	time_to: string | null
	location: string | null
}

export interface ScraperInSISCourseStudyPlan {
	ident: string | null
	facultyIdent: string | null
	period: string | null
	mode_of_study: string | null
	group_code: string | null
}

export interface ScraperInSISStudyPlan {
	id: number
	url: string
	ident: string | null
	title: string | null
	faculty: ScraperInSISFaculty | null
	semester: InSISSemester | null
	year: number | null
	level: string | null
	mode_of_study: string | null
	study_length: string | null
	courses: ScraperInSISStudyPlanCourse[] | null
}

export interface ScraperInSISStudyPlanCourse {
	id: number | null
	url: string | null
	ident: string
	group: InSISStudyPlanCourseGroup
	category: InSISStudyPlanCourseCategory
}

export interface ScraperInSISStudyPlans {
	urls: string[]
}

export interface ScraperInSISAcademicScheduleEvent {
	title: string
	starts_at: string | null // "YYYY-MM-DDTHH:mm:00"
	ends_at: string | null // "YYYY-MM-DDTHH:mm:00"
}

export interface ScraperInSISAcademicSchedule {
	insis_period_id: number
	faculty_ident: string
	semester: InSISSemester | null
	year: number
	level: string | null
	starts_at: string // "YYYY-MM-DD"
	ends_at: string // "YYYY-MM-DD"
	events: ScraperInSISAcademicScheduleEvent[]
}

export interface ScraperInSISAcademicSchedules {
	faculties_count: number
	periods_count: number
}

export interface ScraperInSISFacultyTimetables {
	faculties_count: number
}

export interface ScraperInSISFacultyTimetable {
	ident: string
	is_schedule_publicly_visible: boolean
}
