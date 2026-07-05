// Server-side cap on the number of course_ids considered per /optimize request.
// Defined here (not in api/ or client/) so OptimizeService (enforces the cap) and the
// results drawer (references the number in the truncation notice copy) read the same constant.
export const MAX_POOL_SIZE = 30

// Cap on explore_course_ids in explore mode — more than this makes per-course budgets too tight.
export const MAX_EXPLORE_POOL_SIZE = 20

export type {
	SolverConstraints,
	OptimizeRequest,
	OptimizeResponseDTO,
	OptimizerCandidateDTO,
	RemovalCandidateDTO,
	ExploreResultDTO,
	ScoreBreakdownDTO,
	SelectedCourseUnitDTO
} from '@kreditozrouti/types'
