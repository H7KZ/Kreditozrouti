import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

// ── Base domain primitives ────────────────────────────────────────────────────

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

// ── InSIS domain ──────────────────────────────────────────────────────────────

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

// ── Timetable ─────────────────────────────────────────────────────────────────

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

// ── Assessment ────────────────────────────────────────────────────────────────

export type AssessmentBucketKey = 'final_test' | 'oral_exam' | 'ongoing_tests' | 'paper_project' | 'presentation' | 'activity'

// ── HTTP filters ──────────────────────────────────────────────────────────────

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

// ── HTTP response DTOs ────────────────────────────────────────────────────────

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

// ── HTTP share DTOs ───────────────────────────────────────────────────────────

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

// ── HTTP iCal DTOs ────────────────────────────────────────────────────────────

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

// ── HTTP admin DTOs ───────────────────────────────────────────────────────────

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

// ── Optimizer public DTOs ─────────────────────────────────────────────────────

export interface SolverConstraints {
	// Inclusion / exclusion
	required_course_ids?: number[]
	excluded_course_ids?: number[]

	// Credit limits
	credit_min?: number
	credit_max?: number

	// Time preferences
	/** Reuses the same TimeSelection shape as CoursesFilter.exclude_times. */
	blackout_windows?: TimeSelection[]
	preferred_days?: Day[]
	max_consecutive_minutes?: number
}

/**
 * Optimizer-side mirror of client/src/types/course.ts's SelectedCourseUnit, field-for-field.
 * Defined here rather than imported from client/ because shared/ must never import from
 * client/ per root CLAUDE.md — OptimizerCandidateDTO.units is directly loadable via
 * timetable.store.loadUnits() without client-side remapping.
 */
export interface SelectedCourseUnitDTO {
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

export interface ScoreBreakdownDTO {
	campus_conflicts: number
	gap_minutes: number
	off_preferred_days: number
	long_study_blocks: number
	total: number
}

export interface OptimizerCandidateDTO {
	units: SelectedCourseUnitDTO[]
	score: ScoreBreakdownDTO
	/** Unit IDs that differ from the student's current selection, for diff highlighting. */
	changed_unit_ids: number[]
}

export interface RemovalCandidateDTO extends OptimizerCandidateDTO {
	dropped_course_id: number
	dropped_course_title: string
}

/** One entry per explore_course_id, sorted by best_candidate.score.total ascending (nulls last). */
export interface ExploreResultDTO {
	course_id: number
	course_ident: string
	course_title: string
	course_title_cs: string
	course_title_en: string
	ects: number | null
	/** Best conflict-free timetable found for basket + this course; null if no schedule exists. */
	best_candidate: OptimizerCandidateDTO | null
}

export interface OptimizeResponseDTO {
	full_candidates: OptimizerCandidateDTO[]
	removal_candidates: RemovalCandidateDTO[]
	/** True if the timeout guard fired before the search space was exhausted. */
	partial: boolean
	/** Only present in 'add' mode when a clean slot required unlocking one existing course. */
	unlocked_course_id?: number
	/** True when more course_ids were supplied than MAX_POOL_SIZE and the excess was dropped before solving. */
	pool_truncated: boolean
	/** Only present in 'explore' mode: one entry per explored course, best-fit first. */
	explore_results?: ExploreResultDTO[]
}

export interface OptimizeRequest {
	course_ids: number[]
	constraints: SolverConstraints
	mode: 'build' | 'explore'
	locked_unit_ids?: number[]
	/** Required when mode === 'explore': courses to try adding to course_ids one at a time. */
	explore_course_ids?: number[]
}

// Faculty
export interface MCPFaculty {
	id: string
	title: string | null
}

// Course
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

// Study plan
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

// ── Queue job types ───────────────────────────────────────────────────────────

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

// ── Database types ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ExcludeMethods<T> = { [K in keyof T as T[K] extends Function ? never : K]: T[K] }

// ---------------------------------------------------------------------------
// Faculty
// ---------------------------------------------------------------------------

export class FacultyTable {
	static readonly _table = 'insis_faculties' as const

	id!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	title!: string | null
	is_schedule_publicly_visible!: ColumnType<boolean, boolean | undefined, boolean>
}

export type Faculty<C = void, SP = void> = Selectable<FacultyTable> &
	(C extends void ? unknown : { courses: C[] }) &
	(SP extends void ? unknown : { study_plans: SP[] })
export type NewFaculty = Insertable<Omit<ExcludeMethods<FacultyTable>, 'id' | 'created_at' | 'updated_at'>>

export type FacultyWithRelations = Faculty<Course, StudyPlan>

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

export class CourseTable {
	static readonly _table = 'insis_courses' as const

	id!: number

	faculty_id!: string | null

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	url!: string
	ident!: string
	title!: string | null
	title_cs!: string | null
	title_en!: string | null
	ects!: number | null
	mode_of_delivery!: string | null
	mode_of_completion!: string | null
	languages!: string | null
	level!: string | null
	year_of_study!: number | null
	semester!: InSISSemester | null
	year!: number | null
	lecturers!: string | null
	prerequisites!: string | null
	recommended_programmes!: string | null
	required_work_experience!: string | null
	blocked_by_course_idents!: ColumnType<string[] | null, string | null, string | null>
	excluded_after_course_idents!: ColumnType<string[] | null, string | null, string | null>
	concurrent_exclusion_idents!: ColumnType<string[] | null, string | null, string | null>
	recommended_before_course_idents!: ColumnType<string[] | null, string | null, string | null>
	aims_of_the_course!: string | null
	learning_outcomes!: string | null
	course_contents!: string | null
	special_requirements!: string | null
	guarantors!: string | null
	last_modified_date!: string | null
	last_modified_by!: string | null
	study_load!: string | null
	literature_required!: string | null
	literature_recommended!: string | null
	aims_of_the_course_en!: string | null
	learning_outcomes_en!: string | null
	course_contents_en!: string | null
	special_requirements_en!: string | null
	literature_required_en!: string | null
	literature_recommended_en!: string | null
	prerequisites_en!: string | null
	recommended_programmes_en!: string | null
	required_work_experience_en!: string | null
	last_scraped_at!: ColumnType<Date, string | undefined, string | undefined> | null
	content_hash_cs!: string | null
	content_hash_en!: string | null
}

export type Course<F = void, U = void, A = void, SP = void> = Selectable<CourseTable> &
	(F extends void ? unknown : { faculty: F | null }) &
	(U extends void ? unknown : { units: U[] }) &
	(A extends void ? unknown : { assessments: A[] }) &
	(SP extends void ? unknown : { study_plans: SP[] })
export type NewCourse = Insertable<Omit<ExcludeMethods<CourseTable>, 'created_at' | 'updated_at'>>

export type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

// ---------------------------------------------------------------------------
// CourseAssessment
// ---------------------------------------------------------------------------

export class CourseAssessmentTable {
	static readonly _table = 'insis_courses_assessments' as const

	id!: Generated<number>
	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	method!: string | null
	method_en!: string | null
	weight!: number | null
}

export type CourseAssessment<C = void> = Selectable<CourseAssessmentTable> & (C extends void ? unknown : { course: C | null })
export type NewCourseAssessment = Insertable<Omit<ExcludeMethods<CourseAssessmentTable>, 'id' | 'created_at' | 'updated_at'>>

export type CourseAssessmentWithRelations = CourseAssessment<Course>

// ---------------------------------------------------------------------------
// CourseUnit
// ---------------------------------------------------------------------------

export class CourseUnitTable {
	static readonly _table = 'insis_courses_units' as const

	id!: Generated<number>
	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	lecturer!: string | null
	capacity!: number | null
	note!: string | null
}

export type CourseUnit<C = void, S = void> = Selectable<CourseUnitTable> &
	(C extends void ? unknown : { course: C | null }) &
	(S extends void ? unknown : { slots: S[] })
export type NewCourseUnit = Insertable<Omit<ExcludeMethods<CourseUnitTable>, 'id' | 'created_at' | 'updated_at'>>

export type CourseUnitWithRelations = CourseUnit<Course, CourseUnitSlot<CourseUnit<void, void>>>

// ---------------------------------------------------------------------------
// CourseUnitSlot
// ---------------------------------------------------------------------------

export class CourseUnitSlotTable {
	static readonly _table = 'insis_courses_units_slots' as const

	id!: Generated<number>
	unit_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	type!: string | null
	frequency!: 'weekly' | 'single' | null
	date!: string | null
	day!: InSISDay | null
	time_from!: number | null
	time_to!: number | null
	location!: string | null
}

export type CourseUnitSlot<C = void, U = void> = Selectable<CourseUnitSlotTable> &
	(C extends void ? unknown : { course: C | null }) &
	(U extends void ? unknown : { unit: U | null })
export type NewCourseUnitSlot = Insertable<Omit<ExcludeMethods<CourseUnitSlotTable>, 'id' | 'created_at' | 'updated_at'>>

export type CourseUnitSlotWithRelations = CourseUnitSlot<Course, CourseUnit<void, CourseUnitSlot<void>>>

// ---------------------------------------------------------------------------
// StudyPlan
// ---------------------------------------------------------------------------

export class StudyPlanTable {
	static readonly _table = 'insis_study_plans' as const

	id!: Generated<number>
	faculty_id!: string | null

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	url!: string
	ident!: string | null
	title!: string | null
	semester!: InSISSemester | null
	year!: number | null
	level!: string | null
	mode_of_study!: string | null
	study_length!: string | null
}

export type StudyPlan<F = void, C = void> = Selectable<StudyPlanTable> &
	(F extends void ? unknown : { faculty: F | null }) &
	(C extends void ? unknown : { courses: C[] })
export type NewStudyPlan = Insertable<Omit<ExcludeMethods<StudyPlanTable>, 'id' | 'created_at' | 'updated_at'>>

export type StudyPlanWithRelations = StudyPlan<Faculty, StudyPlanCourse>

// ---------------------------------------------------------------------------
// StudyPlanCourse
// ---------------------------------------------------------------------------

export class StudyPlanCourseTable {
	static readonly _table = 'insis_study_plans_courses' as const

	id!: Generated<number>
	study_plan_id!: number
	course_id!: number
	course_ident!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	group!: InSISStudyPlanCourseGroup
	category!: InSISStudyPlanCourseCategory
}

export type StudyPlanCourse<SP = void, C = void> = Selectable<StudyPlanCourseTable> &
	(SP extends void ? unknown : { study_plan: SP | null }) &
	(C extends void ? unknown : { course: C | null })
export type NewStudyPlanCourse = Insertable<Omit<ExcludeMethods<StudyPlanCourseTable>, 'id' | 'created_at' | 'updated_at'>>

export type StudyPlanCourseWithRelations = StudyPlanCourse<StudyPlanTable, null>

// ---------------------------------------------------------------------------
// StudyPlanCourseIdent
// ---------------------------------------------------------------------------

export class StudyPlanCourseIdentTable {
	static readonly _table = 'insis_study_plans_course_idents' as const

	id!: Generated<number>
	study_plan_id!: number
	course_ident!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	group!: InSISStudyPlanCourseGroup
	category!: InSISStudyPlanCourseCategory
}

export type StudyPlanCourseIdent<SP = void> = Selectable<StudyPlanCourseIdentTable> & (SP extends void ? unknown : { study_plan: SP | null })
export type NewStudyPlanCourseIdent = Insertable<Omit<ExcludeMethods<StudyPlanCourseIdentTable>, 'id' | 'created_at' | 'updated_at'>>

// ---------------------------------------------------------------------------
// AcademicPeriod
// ---------------------------------------------------------------------------

export class AcademicPeriodTable {
	static readonly _table = 'insis_academic_periods' as const

	id!: Generated<number>
	insis_period_id!: number
	faculty_id!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	semester!: InSISSemester | null
	year!: number
	level!: string | null
	starts_at!: ColumnType<Date, string, string>
	ends_at!: ColumnType<Date, string, string>
	last_scraped_at!: ColumnType<Date, string | undefined, string | undefined> | null
}

export type AcademicPeriod = Selectable<AcademicPeriodTable>
export type NewAcademicPeriod = Insertable<Omit<ExcludeMethods<AcademicPeriodTable>, 'id' | 'created_at' | 'updated_at'>>

// ---------------------------------------------------------------------------
// AcademicScheduleEvent
// ---------------------------------------------------------------------------

export class AcademicScheduleEventTable {
	static readonly _table = 'insis_academic_schedule_events' as const

	id!: Generated<number>
	period_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	title!: string
	starts_at!: ColumnType<Date, string | null, string | null> | null
	ends_at!: ColumnType<Date, string | null, string | null> | null
}

export type AcademicScheduleEvent = Selectable<AcademicScheduleEventTable>
export type NewAcademicScheduleEvent = Insertable<Omit<ExcludeMethods<AcademicScheduleEventTable>, 'id' | 'created_at' | 'updated_at'>>

// ---------------------------------------------------------------------------
// Database mapping
// ---------------------------------------------------------------------------

type AllTableClasses =
	| typeof CourseTable
	| typeof CourseAssessmentTable
	| typeof CourseUnitTable
	| typeof CourseUnitSlotTable
	| typeof StudyPlanTable
	| typeof StudyPlanCourseTable
	| typeof StudyPlanCourseIdentTable
	| typeof FacultyTable
	| typeof AcademicPeriodTable
	| typeof AcademicScheduleEventTable

export type Database = {
	[T in AllTableClasses as T['_table']]: InstanceType<T>
}
