import type { CourseUnitType, Day, TimeSelection } from './domain.js'

export interface SolverConstraints {
	required_course_ids?: number[]
	excluded_course_ids?: number[]
	credit_min?: number
	credit_max?: number
	/** Reuses the same TimeSelection shape as CoursesFilter.exclude_times. */
	blackout_windows?: TimeSelection[]
	preferred_days?: Day[]
	max_consecutive_minutes?: number
}

/**
 * Optimizer-side mirror of client/src/types/course.ts's SelectedCourseUnit, field-for-field.
 * Defined here rather than imported from client/ because shared/ must never import from
 * client/ per root CLAUDE.md â€” OptimizerCandidateDTO.units is directly loadable via
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
