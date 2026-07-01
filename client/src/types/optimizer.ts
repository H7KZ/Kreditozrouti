import type { OptimizerCandidateDTO, RemovalCandidateDTO, SolverConstraints } from '@shared/http/optimize'

/** Named alias for the SolverConstraints payload persisted to localStorage between optimize runs. */
export type PersistedOptimizerConstraints = SolverConstraints

export type OptimizerState = 'setup' | 'generating' | 'results'

export interface OptimizerResults {
	fullCandidates: OptimizerCandidateDTO[]
	removalCandidates: RemovalCandidateDTO[]
	partial: boolean
	poolTruncated: boolean
}
