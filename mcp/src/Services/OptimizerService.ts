import type { MCPCourse } from '@mcp/Services/CourseService.js'
import type {
	ExploreResultDTO,
	OptimizerCandidateDTO,
	OptimizeRequest,
	OptimizeResponseDTO,
	RemovalCandidateDTO,
	ScoreBreakdownDTO,
	SelectedCourseUnitDTO,
	SolverConstraints
} from '@mcp/Domain/optimizer.js'
import type { ScoreBreakdown, SolverAssignment, SolverSlotCandidate, SolverVariable } from '@mcp/Domain/optimizer.js'
import { DEFAULT_WEIGHTS, MAX_EXPLORE_POOL_SIZE, MAX_POOL_SIZE, diversityFilter, scoreCandidate, solveWithDeadline } from '@mcp/Domain/optimizer.js'
import { getSlotType } from '@mcp/Domain/insis.js'
import { getCoursesWithRelations } from '@mcp/Services/CourseService.js'

/**
 * Upper bound (in ms) on how long solveWithDeadline is allowed to search before
 * returning best-so-far partial results.
 */
const SOLVER_BUDGET_MS = 4500

/** Number of diverse candidates returned to the client per section. */
const MAX_CANDIDATES = 5

/**
 * Maps DB courses/units/slots into SolverVariable[]. One variable per
 * (courseId, unitType), with a domain of every concrete slot of that type.
 * Slots with null time_from/time_to are skipped (cannot be scheduled).
 */
function buildVariables(courses: MCPCourse[]): SolverVariable[] {
	const domainsByKey = new Map<string, SolverSlotCandidate[]>()

	for (const course of courses) {
		for (const unit of course.units ?? []) {
			for (const slot of unit.slots ?? []) {
				if (slot.time_from == null || slot.time_to == null) continue

				const unitType = getSlotType(slot)
				const key = `${course.id}:${unitType}`
				const candidate: SolverSlotCandidate = {
					unitId: unit.id,
					slotId: slot.id,
					courseId: course.id,
					unitType,
					day: slot.day ?? undefined,
					date: slot.date ?? undefined,
					timeFrom: slot.time_from,
					timeTo: slot.time_to,
					location: slot.location ?? undefined
				}

				const existing = domainsByKey.get(key)
				if (existing) existing.push(candidate)
				else domainsByKey.set(key, [candidate])
			}
		}
	}

	const variables: SolverVariable[] = []
	for (const [key, domain] of domainsByKey) {
		const [courseIdStr, unitType] = key.split(':') as [string, SolverSlotCandidate['unitType']]
		variables.push({ courseId: Number(courseIdStr), unitType, domain })
	}
	return variables
}

/**
 * Pre-filters solver variables by removing any domain slot that overlaps a blackout window.
 */
function filterCandidatesByBlackout(variables: SolverVariable[], blackoutWindows: SolverConstraints['blackout_windows']): SolverVariable[] {
	if (!blackoutWindows?.length) return variables
	return variables.map(v => ({
		...v,
		domain: v.domain.filter(c => !blackoutWindows.some(w => w.day && c.day === w.day && c.timeFrom < w.time_to && c.timeTo > w.time_from))
	}))
}

/**
 * Drops solver assignments whose total ECTS falls outside [credit_min, credit_max].
 * Applied after solving, before ranking/mapping.
 */
function filterByCredit(
	assignments: SolverAssignment[],
	constraints: SolverConstraints,
	courseById: Map<number, MCPCourse>
): SolverAssignment[] {
	const { credit_min, credit_max } = constraints
	if (credit_min == null && credit_max == null) return assignments
	return assignments.filter(assignment => {
		const uniqueCourseIds = new Set([...Object.keys(assignment)].map(key => Number(key.split(':')[0])))
		const totalEcts = [...uniqueCourseIds].reduce((sum, id) => sum + (courseById.get(id)?.ects ?? 0), 0)
		if (credit_min != null && totalEcts < credit_min) return false
		if (credit_max != null && totalEcts > credit_max) return false
		return true
	})
}

/** Derives the snapshot of unit types available for a course. */
function snapshotAvailableTypes(course: MCPCourse): SelectedCourseUnitDTO['snapshotAvailableTypes'] {
	const types: SelectedCourseUnitDTO['snapshotAvailableTypes'] = []
	const seen = new Set<string>()
	for (const unit of course.units ?? []) {
		for (const slot of unit.slots ?? []) {
			const type = getSlotType(slot)
			if (!seen.has(type)) {
				seen.add(type)
				types.push(type)
			}
		}
	}
	return types
}

/**
 * Rebuilds a SolverSlotCandidate into the wire-format SelectedCourseUnitDTO.
 */
function toSelectedCourseUnitDTO(candidate: SolverSlotCandidate, courseById: Map<number, MCPCourse>): SelectedCourseUnitDTO {
	const course = courseById.get(candidate.courseId)
	const unit = course?.units.find(u => u.id === candidate.unitId)

	return {
		courseId: candidate.courseId,
		courseIdent: course?.ident ?? '',
		courseTitle: course?.title ?? course?.title_en ?? course?.title_cs ?? '',
		courseTitleCs: course?.title_cs ?? course?.title ?? '',
		courseTitleEn: course?.title_en ?? course?.title ?? '',
		unitId: candidate.unitId,
		unitType: candidate.unitType,
		slotId: candidate.slotId,
		day: candidate.day,
		date: candidate.date,
		timeFrom: candidate.timeFrom,
		timeTo: candidate.timeTo,
		location: candidate.location,
		lecturer: unit?.lecturer ?? undefined,
		ects: course?.ects ?? undefined,
		snapshotAvailableTypes: course ? snapshotAvailableTypes(course) : undefined
	}
}

function toScoreBreakdownDTO(score: ScoreBreakdown): ScoreBreakdownDTO {
	return {
		campus_conflicts: score.campusConflicts,
		gap_minutes: score.gapMinutes,
		off_preferred_days: score.offPreferredDays,
		long_study_blocks: score.longStudyBlocks,
		total: score.total
	}
}

/**
 * Scores every assignment, sorts ascending by score.total, diversity-filters
 * to MAX_CANDIDATES, then maps each kept assignment to an OptimizerCandidateDTO.
 */
function rankAndMapCandidates(
	assignments: SolverAssignment[],
	constraints: SolverConstraints,
	courseById: Map<number, MCPCourse>
): OptimizerCandidateDTO[] {
	if (assignments.length === 0) return []
	const scored = assignments.map(assignment => ({ assignment, score: scoreCandidate(assignment, constraints, DEFAULT_WEIGHTS) }))
	scored.sort((a, b) => a.score.total - b.score.total)
	const kept = diversityFilter(
		scored.map(s => s.assignment),
		MAX_CANDIDATES
	)
	return kept.map(assignment => ({
		units: Object.values(assignment).map(c => toSelectedCourseUnitDTO(c, courseById)),
		score: toScoreBreakdownDTO(scoreCandidate(assignment, constraints, DEFAULT_WEIGHTS)),
		changed_unit_ids: [] as number[]
	}))
}

function optimizeBuild(courses: MCPCourse[], request: OptimizeRequest, poolTruncated: boolean): OptimizeResponseDTO {
	const courseById = new Map(courses.map(c => [c.id, c]))
	const allVariables = buildVariables(courses)
	const effectiveVariables = filterCandidatesByBlackout(allVariables, request.constraints.blackout_windows)

	// Pass 1: solve with all basket courses free
	const { candidates: raw1, partial: partial1 } = solveWithDeadline(effectiveVariables, [], SOLVER_BUDGET_MS)
	const fullCandidates = rankAndMapCandidates(
		filterByCredit(raw1, request.constraints, courseById),
		request.constraints,
		courseById
	)

	// Pass 2: drop one course at a time, keep best per dropped course
	const removalResults: { course: MCPCourse; candidate: OptimizerCandidateDTO }[] = []
	const pass2Deadline = Date.now() + SOLVER_BUDGET_MS
	let anyPartial2 = false

	for (const course of courses) {
		const remaining = pass2Deadline - Date.now()
		if (remaining <= 0) break
		const varsWithout = effectiveVariables.filter(v => v.courseId !== course.id)
		const { candidates: raw2, partial: p2 } = solveWithDeadline(varsWithout, [], Math.min(remaining, SOLVER_BUDGET_MS))
		if (p2) anyPartial2 = true
		const ranked2 = rankAndMapCandidates(
			filterByCredit(raw2, request.constraints, courseById),
			request.constraints,
			courseById
		)
		if (ranked2[0]) removalResults.push({ course, candidate: ranked2[0] })
	}

	// Sort ascending by score.total, keep top MAX_CANDIDATES
	removalResults.sort((a, b) => a.candidate.score.total - b.candidate.score.total)
	const removalCandidates: RemovalCandidateDTO[] = removalResults.slice(0, MAX_CANDIDATES).map(r => ({
		...r.candidate,
		dropped_course_id: r.course.id,
		dropped_course_title: r.course.title ?? r.course.title_en ?? r.course.title_cs ?? r.course.ident
	}))

	return {
		full_candidates: fullCandidates,
		removal_candidates: removalCandidates,
		partial: partial1 || anyPartial2,
		pool_truncated: poolTruncated
	}
}

/**
 * Explore mode: for each course in exploreIds, solve (basket + that course) and
 * return the best-fit schedule per course, sorted by score ascending (nulls last).
 */
function optimizeExplore(
	allCourses: MCPCourse[],
	basketIds: number[],
	exploreIds: number[],
	request: OptimizeRequest,
	poolTruncated: boolean
): OptimizeResponseDTO {
	const courseById = new Map(allCourses.map(c => [c.id, c]))
	const basketCourses = allCourses.filter(c => basketIds.includes(c.id))
	const exploreCourses = allCourses.filter(c => exploreIds.includes(c.id))

	const basketVariables = filterCandidatesByBlackout(
		buildVariables(basketCourses),
		request.constraints.blackout_windows
	)

	// Give each explore course a fair share of the total budget, capped at 800ms.
	const perCourseBudget = Math.min(800, Math.floor(SOLVER_BUDGET_MS / Math.max(1, exploreCourses.length)))
	const exploreResults: ExploreResultDTO[] = []

	for (const course of exploreCourses) {
		const exploreVars = filterCandidatesByBlackout(buildVariables([course]), request.constraints.blackout_windows)
		const { candidates } = solveWithDeadline([...basketVariables, ...exploreVars], [], perCourseBudget)
		const creditFiltered = filterByCredit(candidates, request.constraints, courseById)
		const ranked = rankAndMapCandidates(creditFiltered, request.constraints, courseById)

		exploreResults.push({
			course_id: course.id,
			course_ident: course.ident,
			course_title: course.title ?? course.title_en ?? course.title_cs ?? course.ident,
			course_title_cs: course.title_cs ?? course.title ?? '',
			course_title_en: course.title_en ?? course.title ?? '',
			ects: course.ects ?? null,
			best_candidate: ranked[0] ?? null
		})
	}

	exploreResults.sort((a, b) => {
		if (!a.best_candidate && !b.best_candidate) return 0
		if (!a.best_candidate) return 1
		if (!b.best_candidate) return -1
		return a.best_candidate.score.total - b.best_candidate.score.total
	})

	return {
		full_candidates: [],
		removal_candidates: [],
		partial: false,
		pool_truncated: poolTruncated,
		explore_results: exploreResults
	}
}

export async function optimize(request: OptimizeRequest): Promise<OptimizeResponseDTO> {
	const courseIds = request.course_ids.slice(0, MAX_POOL_SIZE)
	const poolTruncated = request.course_ids.length > MAX_POOL_SIZE

	if (request.mode === 'explore') {
		const exploreIds = (request.explore_course_ids ?? []).slice(0, MAX_EXPLORE_POOL_SIZE)
		const allIds = [...new Set([...courseIds, ...exploreIds])]
		const { courses } = await getCoursesWithRelations({ ids: allIds }, allIds.length, 0)
		return optimizeExplore(courses, courseIds, exploreIds, request, poolTruncated)
	}

	const { courses } = await getCoursesWithRelations({ ids: courseIds }, courseIds.length, 0)
	return optimizeBuild(courses, request, poolTruncated)
}
