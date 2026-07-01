import type { SolverConstraints } from '@shared/http/optimize'

/** Whether the optimizer is building a fresh timetable or adding a course to an existing one. */
export type OptimizerMode = 'build' | 'add'

/** Client-only UI state for the optimizer's config and results drawers. */
export interface OptimizerDrawerState {
	configOpen: boolean
	resultsOpen: boolean
	mode: OptimizerMode
	activeCandidateIndex: number
}

/** Named alias for the SolverConstraints payload persisted to localStorage between optimize runs. */
export type PersistedOptimizerConstraints = SolverConstraints
