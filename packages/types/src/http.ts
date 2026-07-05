import type { CourseUnitType, Day, InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup, TimeSelection } from './domain'

// ── Filters ───────────────────────────────────────────────────────────────────

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
	assessment_methods?: string[]
	completed_course_idents?: string[]
	sort_by?: 'ident' | 'title' | 'ects' | 'faculty' | 'year' | 'semester'
	sort_dir?: 'asc' | 'desc'
	limit: number
	offset: number
}

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

export interface FacetItem {
	value: string | number | Date | null
	count: number
}

export interface PaginationMeta {
	limit: number
	offset: number
	count: number
	total: number
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export interface FacultyDTO {
	id: string
	created_at: string
	updated_at: string
	title: string | null
	is_schedule_publicly_visible: boolean
}

export interface CourseAssessmentDTO {
	id: number
	course_id: number
	created_at: string
	updated_at: string
	method: string | null
	method_en: string | null
	weight: number | null
}

export interface CourseUnitSlotDTO {
	id: number
	unit_id: number
	created_at: string
	updated_at: string
	type: CourseUnitType | null
	frequency: 'weekly' | 'single' | null
	date: string | null
	day: Day | null
	time_from: number | null
	time_to: number | null
	location: string | null
}

export interface CourseUnitDTO {
	id: number
	course_id: number
	created_at: string
	updated_at: string
	lecturer: string | null
	capacity: number | null
	note: string | null
	slots: CourseUnitSlotDTO[]
}

export interface StudyPlanCourseDTO {
	id: number
	study_plan_id: number
	course_id: number | null
	course_ident: string
	created_at: string
	updated_at: string
	group: InSISStudyPlanCourseGroup
	category: InSISStudyPlanCourseCategory
}

export interface CourseDTO {
	id: number
	faculty_id: string | null
	created_at: string
	updated_at: string
	url: string
	ident: string
	title: string | null
	title_cs: string | null
	title_en: string | null
	ects: number | null
	mode_of_delivery: string | null
	mode_of_completion: 'exam' | 'credit' | 'defense' | null
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
	guarantors: string | null
	last_modified_date: string | null
	last_modified_by: string | null
	study_load: string | null
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
	blocked_by_course_idents: string[] | null
	excluded_after_course_idents: string[] | null
	concurrent_exclusion_idents: string[] | null
	recommended_before_course_idents: string[] | null
}

export interface CourseWithRelationsDTO extends CourseDTO {
	faculty: FacultyDTO | null
	units: CourseUnitDTO[]
	assessments: CourseAssessmentDTO[]
	study_plans: StudyPlanCourseDTO[]
}

export interface StudyPlanDTO {
	id: number
	faculty_id: string | null
	created_at: string
	updated_at: string
	url: string
	ident: string | null
	title: string | null
	semester: InSISSemester | null
	year: number | null
	level: string | null
	mode_of_study: string | null
	study_length: string | null
}

export interface StudyPlanWithRelationsDTO extends StudyPlanDTO {
	faculty: FacultyDTO | null
	courses: StudyPlanCourseDTO[]
}

export interface CoursesResponseDTO {
	data: CourseWithRelationsDTO[]
	facets: {
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
		assessment_methods: FacetItem[]
		time_range: { min_time: number; max_time: number }
	}
	meta: PaginationMeta
}

export interface StudyPlansResponseDTO {
	data: StudyPlanWithRelationsDTO[]
	facets: {
		faculties: FacetItem[]
		levels: FacetItem[]
		semesters: FacetItem[]
		years: FacetItem[]
		modes_of_studies: FacetItem[]
		study_lengths: FacetItem[]
	}
	meta: PaginationMeta
}

export interface StudyPlanCoursesResponseDTO {
	data: CourseDTO[]
	meta: {
		count: number
		total: number
	}
}

// ── Share DTOs ────────────────────────────────────────────────────────────────

export interface ShareableUnit {
	courseId: number
	courseIdent: string
	courseTitle: string
	courseTitleCs: string
	courseTitleEn: string
	unitId: number
	unitType: CourseUnitType
	slotId: number
	day?: Day
	date?: string
	timeFrom: number
	timeTo: number
	location?: string
	lecturer?: string
	ects?: number
	snapshotAvailableTypes?: CourseUnitType[]
}

export interface ShareCreateRequest {
	units: ShareableUnit[]
}

export interface ShareCreateResponse {
	id: string
}

export interface ShareGetResponse {
	units: ShareableUnit[]
}

// ── iCal DTOs ─────────────────────────────────────────────────────────────────

export interface ICalUnit {
	courseId: number
	courseIdent: string
	courseTitle: string
	courseTitleCs: string
	courseTitleEn: string
	unitId: number
	unitType: CourseUnitType
	slotId: number
	day?: Day
	date?: string
	timeFrom: number
	timeTo: number
	location?: string
	lecturer?: string
}

export interface ICalConfig {
	slotId: number
	title: string
	location: string
	description: string
}

export interface ICalCreateRequest {
	units: ICalUnit[]
	configs: ICalConfig[]
	semesterStart: string // YYYY-MM-DD
	semesterEnd: string // YYYY-MM-DD
}

export interface ICalCreateResponse {
	id: string
}

// ── Admin DTOs ────────────────────────────────────────────────────────────────

export interface QueueStats {
	active: number
	waiting: number
	delayed: number
	completed: number
	failed: number
	paused: number
}

export interface SchedulerInfo {
	id: string
	name: string
	pattern: string
	nextRun: string | null
}

export interface DbTotals {
	courses: number
	studyPlans: number
	faculties: number
}

export interface FacultyStats {
	facultyId: string
	facultyTitle: string | null
	courseCount: number
	avgAgeHours: number
	oldestUpdatedAt: string
	newestUpdatedAt: string
}

export interface StaleCourseCount {
	thresholdDays: number
	count: number
}

export interface FailedJob {
	id: string | undefined
	name: string
	failedReason: string | undefined
	processedOn: number | undefined
	data: Record<string, unknown>
}

export interface CompletedJob {
	id: string | undefined
	name: string
	finishedOn: number | undefined
	processedOn: number | undefined
	data: Record<string, unknown>
}

export interface RecentError {
	status: number
	method: string
	path: string
	query?: Record<string, unknown>
	ip?: string
	duration_ms: number
	timestamp: string
}

export interface ErrorMetrics {
	last24h: {
		total4xx: number
		total5xx: number
		byStatus: Record<string, number>
		topPaths: { path: string; count: number }[]
	}
	hourly: {
		hour: string
		errors4xx: number
		errors5xx: number
	}[]
	recent: RecentError[]
}

export interface AdminStatsResponse {
	queue: { request: QueueStats }
	schedulers: SchedulerInfo[]
	database: {
		totals: DbTotals
		facultyBreakdown: FacultyStats[]
		staleCourses: StaleCourseCount[]
		recentlyUpdated: number
	}
	recentJobs: {
		failed: FailedJob[]
		completed: CompletedJob[]
	}
	errorMetrics: ErrorMetrics
}
