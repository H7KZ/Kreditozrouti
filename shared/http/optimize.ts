import type { Day } from '../domain/constants.js'
import type { CourseUnitType } from '../domain/insis.js'
import type { TimeSelection } from '../domain/time.js'

// Server-side cap on the number of course_ids considered per /optimize request.
// Defined here (not in api/ or client/) so OptimizeService (enforces the cap) and the
// results drawer (references the number in the truncation notice copy) read the same constant.
export const MAX_POOL_SIZE = 30

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

export interface OptimizeRequest {
	course_ids: number[]
	constraints: SolverConstraints
	mode: 'build' | 'add'
	/** Required when mode === 'add': slot/unit IDs from the student's current selections that must stay fixed. */
	locked_unit_ids?: number[]
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

export interface OptimizeResponseDTO {
	candidates: OptimizerCandidateDTO[]
	/** True if the timeout guard fired before the search space was exhausted. */
	partial: boolean
	/** Only present in 'add' mode when a clean slot required unlocking one existing course. */
	unlocked_course_id?: number
	/** True when more course_ids were supplied than MAX_POOL_SIZE and the excess was dropped before solving. */
	pool_truncated: boolean
}
