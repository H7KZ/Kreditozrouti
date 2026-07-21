import type { InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup, ScraperJob } from './domain.js'

// InSIS scraper payloads

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

export interface ScraperInSISCourseAssessmentMethod {
	method: string | null
	method_en: string | null
	weight: string | null
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

export interface ScraperInSISCourseTimetableUnit {
	lecturer: string | null
	capacity: number | null
	note: string | null
	slots: ScraperInSISCourseTimetableSlot[] | null
}

export interface ScraperInSISCourseStudyPlan {
	ident: string | null
	facultyIdent: string | null
	period: string | null
	mode_of_study: string | null
	group_code: string | null
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

export interface ScraperInSISStudyPlanCourse {
	id: number | null
	url: string | null
	ident: string
	group: InSISStudyPlanCourseGroup
	category: InSISStudyPlanCourseCategory
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

// Job types

interface ScraperRequestJobBase {
	type: ScraperJob
	error?: { message: string }
}

export interface ScraperInSISCatalogRequestJob extends ScraperRequestJobBase {
	type: 'InSIS:Catalog'
	faculties?: string[]
	periods?: { semester: InSISSemester | null; year: number }[]
	auto_queue_courses?: boolean
	allowed_idents?: string[]
}

export interface ScraperInSISCourseRequestJob extends ScraperRequestJobBase {
	type: 'InSIS:Course'
	url: string
	content_hash_cs?: string | null
	content_hash_en?: string | null
}

export interface ScraperInSISStudyPlansRequestJob extends ScraperRequestJobBase {
	type: 'InSIS:StudyPlans'
	faculties?: string[]
	periods?: { semester: InSISSemester | null; year: number }[]
	auto_queue_study_plans?: boolean
}

export interface ScraperInSISStudyPlanRequestJob extends ScraperRequestJobBase {
	type: 'InSIS:StudyPlan'
	url: string
}

export interface ScraperInSISAcademicSchedulesRequestJob extends ScraperRequestJobBase {
	type: 'InSIS:AcademicSchedules'
}

export interface ScraperInSISAcademicScheduleRequestJob extends ScraperRequestJobBase {
	type: 'InSIS:AcademicSchedule'
	insis_faculty_id: number
	insis_period_id: number
	faculty_ident: string
	semester: InSISSemester | null
	year: number
	level: string | null
	starts_at: string // "YYYY-MM-DD"
	ends_at: string // "YYYY-MM-DD"
}

export interface ScraperInSISFacultyTimetablesRequestJob extends ScraperRequestJobBase {
	type: 'InSIS:FacultyTimetables'
}

export interface ScraperInSISFacultyTimetableRequestJob extends ScraperRequestJobBase {
	type: 'InSIS:FacultyTimetable'
	f_id: number
	name: string
}

export type ScraperRequestJob =
	| ScraperInSISCatalogRequestJob
	| ScraperInSISCourseRequestJob
	| ScraperInSISStudyPlansRequestJob
	| ScraperInSISStudyPlanRequestJob
	| ScraperInSISAcademicSchedulesRequestJob
	| ScraperInSISAcademicScheduleRequestJob
	| ScraperInSISFacultyTimetablesRequestJob
	| ScraperInSISFacultyTimetableRequestJob

interface ScraperResponseJobBase {
	type: ScraperJob
	error?: { message: string }
}

export interface ScraperInSISCatalogResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:Catalog'
	catalog: ScraperInSISCatalog
}

export interface ScraperInSISCourseResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:Course'
	course_id: number
	course: ScraperInSISCourse | null
}

export interface ScraperInSISStudyPlansResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:StudyPlans'
	plans: ScraperInSISStudyPlans
}

export interface ScraperInSISStudyPlanResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:StudyPlan'
	plan: ScraperInSISStudyPlan | null
}

export interface ScraperInSISAcademicSchedulesResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:AcademicSchedules'
	schedules: ScraperInSISAcademicSchedules
}

export interface ScraperInSISAcademicScheduleResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:AcademicSchedule'
	schedule: ScraperInSISAcademicSchedule
}

export interface ScraperInSISFacultyTimetablesResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:FacultyTimetables'
	data: ScraperInSISFacultyTimetables
}

export interface ScraperInSISFacultyTimetableResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:FacultyTimetable'
	timetable: ScraperInSISFacultyTimetable
}

export interface ScraperInSISGapSweepResponseJob extends ScraperResponseJobBase {
	type: 'InSIS:GapSweep'
}

export type ScraperResponseJob =
	| ScraperInSISCatalogResponseJob
	| ScraperInSISCourseResponseJob
	| ScraperInSISStudyPlansResponseJob
	| ScraperInSISStudyPlanResponseJob
	| ScraperInSISAcademicSchedulesResponseJob
	| ScraperInSISAcademicScheduleResponseJob
	| ScraperInSISFacultyTimetablesResponseJob
	| ScraperInSISFacultyTimetableResponseJob
	| ScraperInSISGapSweepResponseJob
