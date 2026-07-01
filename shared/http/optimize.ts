import type { Day } from '../domain/constants.js'
import type { CourseUnitType } from '../domain/insis.js'
import type { TimeSelection } from '../domain/time.js'

// Server-side cap on the number of course_ids considered per /optimize request.
// Defined here so OptimizeService (enforces the cap) and any UI copy share the same constant.
export const MAX_POOL_SIZE = 30

export interface SolverConstraints {
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
 * client/ — OptimizerCandidateDTO.units is directly loadable via timetable.store.loadUnits().
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

export interface OptimizeRequest {
	course_ids: number[]
	constraints: SolverConstraints
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
}

export interface RemovalCandidateDTO extends OptimizerCandidateDTO {
	dropped_course_id: number
	dropped_course_title: string
}

export interface OptimizeResponseDTO {
	/** Pass 1: all basket courses fit. Up to 5 diverse candidates. */
	full_candidates: OptimizerCandidateDTO[]
	/** Pass 2: best result per dropped course, sorted ascending by score.total. Up to 5. */
	removal_candidates: RemovalCandidateDTO[]
	/** True if the timeout guard fired before the search space was exhausted. */
	partial: boolean
	/** True when more course_ids were supplied than MAX_POOL_SIZE and the excess was dropped. */
	pool_truncated: boolean
}
