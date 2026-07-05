// Base domain primitives

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

// Optimizer public DTOs

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
