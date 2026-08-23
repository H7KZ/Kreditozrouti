// Section 1: imports
// Section 1: imports
import type { CourseUnitType, Day, ScheduledUnit, ScoreBreakdownDTO, SolverConstraints } from '@kreditozrouti/types'
import { getDayFromDate } from './day.js'
import { checkCourseCompleteness, unitsCampusConflict, unitsConflict } from './timetable.js' // Section 2: Constants

// Section 2: Constants

// Server-side cap on the number of course_ids considered per /optimize request.
export const MAX_POOL_SIZE = 30

// Cap on explore_course_ids in explore mode — more than this makes per-course budgets too tight.
export const MAX_EXPLORE_POOL_SIZE = 20

// Section 3: Copied from shared/domain/optimizer.ts

// Variable/domain modeling

/**
 * One concrete slot offering that could satisfy a (course, unitType) variable.
 * Extends ScheduledUnit (day/date/timeFrom/timeTo/location) with the identifiers
 * needed to key an assignment and to diff/apply the result downstream.
 */
export interface SolverSlotCandidate extends ScheduledUnit {
	unitId: number
	slotId: number
	courseId: number
	unitType: CourseUnitType
}

/**
 * A (course, requiredUnitType) pair the solver must assign exactly one
 * SolverSlotCandidate to. A course requiring lecture+seminar contributes two
 * variables.
 */
export interface SolverVariable {
	courseId: number
	unitType: CourseUnitType
	/** Candidate assignments for this variable, already conflict-free against locked assignments. */
	domain: SolverSlotCandidate[]
}

/**
 * A complete or partial mapping from variable key (`${courseId}:${unitType}`) to
 * the SolverSlotCandidate chosen for it.
 */
export type SolverAssignment = Record<string, SolverSlotCandidate>

/**
 * Itemized soft-constraint violation counts plus the weighted-sum total.
 * Mirrors ScoreBreakdownDTO's field grouping (shared/http/optimize.ts) one level
 * removed from the wire-format snake_case naming.
 */
export interface ScoreBreakdown {
	campusConflicts: number
	gapMinutes: number
	offPreferredDays: number
	longStudyBlocks: number
	total: number
}

/** Result of a deadline-bounded backtracking search. */
export interface SolveResult {
	candidates: SolverAssignment[]
	/** True if the in-recursion deadline guard fired before the search space was exhausted. */
	partial: boolean
}

/** Weighted-sum scoring weights for scoreCandidate. Tunable starting values. */
export const DEFAULT_WEIGHTS = {
	campusConflict: 50,
	gapMinutePenalty: 0.5,
	offPreferredDay: 10,
	consecutiveBlockOverage: 5
} as const

// Backtracking search

/**
 * Returns true when placing `candidate` alongside every already-placed unit
 * (both the partial assignment and any locked/fixed units) produces no hard
 * time overlap. Only unitsConflict is checked here — unitsCampusConflict is a
 * SOFT constraint (scored, never pruned) per CONTEXT.md, so it must never be
 * called inside this gate.
 */
function isConsistent(candidate: SolverSlotCandidate, assignment: SolverAssignment, locked: SolverSlotCandidate[]): boolean {
	const placed = [...Object.values(assignment), ...locked]
	return placed.every(other => !unitsConflict(candidate, other))
}

/**
 * Upper bound on the number of complete assignments accumulated by
 * solveWithDeadline before the search stops branching into new candidates.
 * Downstream callers only ever need the top 5 diverse candidates (see
 * diversityFilter), and enumerating literally every complete conflict-free
 * assignment is a combinatorially harder problem than "find enough good
 * candidates to rank" — without this cap, realistic-scale pools (e.g. 20
 * courses x 3 slots) can have far more complete assignments than fit in the
 * <5s budget, even though a suitable subset is found almost immediately.
 * Reaching this cap is NOT a deadline trip: it does not set `partial`.
 */
const MAX_SOLUTIONS = 200

/**
 * Exact backtracking search over (course, unitType) variables using a
 * most-constrained-variable (fail-first) ordering heuristic and hard-overlap
 * pruning. The deadline is polled INSIDE the recursion (`Date.now() >
 * deadline`) at the start of every invocation so a synchronous CPU-bound
 * search returns best-so-far partial results — this is the only viable
 * cancellation mechanism for blocking recursion on Node's single-threaded
 * event loop; do NOT use setTimeout/Promise.race/AbortController here.
 */
export function solveWithDeadline(variables: SolverVariable[], locked: SolverSlotCandidate[], budgetMs: number): SolveResult {
	const deadline = Date.now() + budgetMs
	const found: SolverAssignment[] = []
	let hitDeadline = false
	let hitCap = false

	function recurse(vars: SolverVariable[], assignment: SolverAssignment): void {
		if (found.length >= MAX_SOLUTIONS) {
			hitCap = true
			return
		}
		if (Date.now() > deadline) {
			hitDeadline = true
			return
		}
		if (vars.length === 0) {
			found.push(assignment)
			return
		}

		// Most-constrained-variable heuristic: branch on the smallest domain first, over a copy.
		const sorted = [...vars].sort((a, b) => a.domain.length - b.domain.length)
		const [variable, ...rest] = sorted
		if (!variable) return

		for (const candidate of variable.domain) {
			if (hitDeadline || hitCap || found.length >= MAX_SOLUTIONS) return
			if (!isConsistent(candidate, assignment, locked)) continue
			const key = `${variable.courseId}:${variable.unitType}`
			recurse(rest, { ...assignment, [key]: candidate })
		}
	}

	recurse(variables, {})
	return { candidates: found, partial: hitDeadline }
}

// Scoring

interface DayGroupable {
	day?: Day
	date?: string | null
	timeFrom: number
	timeTo: number
}

/** Groups units by day (mirrors the unitsByDay Map<Day, units[]> shape used by client/src/stores/timetable.store.ts). */
function groupByDay<T extends DayGroupable>(units: T[]): Map<Day, T[]> {
	const map = new Map<Day, T[]>()
	for (const unit of units) {
		const day = unit.day ?? (unit.date ? (getDayFromDate(unit.date) ?? undefined) : undefined)
		if (!day) continue
		const bucket = map.get(day)
		if (bucket) bucket.push(unit)
		else map.set(day, [unit])
	}
	return map
}

/**
 * Computes the itemized weighted-sum soft-constraint score for a complete
 * assignment. Campus conflicts, schedule gaps, off-preferred-day placements,
 * and over-long consecutive study blocks are all SOFT constraints — none of
 * them prune the search (see isConsistent); they only affect ranking here.
 */
export function scoreCandidate(
	assignment: SolverAssignment,
	constraints: SolverConstraints,
	weights: typeof DEFAULT_WEIGHTS = DEFAULT_WEIGHTS
): ScoreBreakdown {
	const units = Object.values(assignment)

	let campusConflicts = 0
	for (let i = 0; i < units.length; i++) {
		for (let j = i + 1; j < units.length; j++) {
			if (unitsCampusConflict(units[i]!, units[j]!)) campusConflicts++
		}
	}

	const byDay = groupByDay(units)

	let gapMinutes = 0
	for (const dayUnits of byDay.values()) {
		const sorted = [...dayUnits].sort((a, b) => a.timeFrom - b.timeFrom)
		for (let i = 1; i < sorted.length; i++) {
			const gap = sorted[i]!.timeFrom - sorted[i - 1]!.timeTo
			if (gap > 15) gapMinutes += gap
		}
	}

	let offPreferredDays = 0
	if (constraints.preferred_days && constraints.preferred_days.length > 0) {
		const preferred = new Set(constraints.preferred_days)
		for (const unit of units) {
			if (unit.day && !preferred.has(unit.day)) offPreferredDays++
		}
	}

	let longStudyBlocks = 0
	if (constraints.max_consecutive_minutes && constraints.max_consecutive_minutes > 0) {
		const maxConsecutive = constraints.max_consecutive_minutes
		for (const dayUnits of byDay.values()) {
			const sorted = [...dayUnits].sort((a, b) => a.timeFrom - b.timeFrom)
			let blockStart = sorted[0]?.timeFrom ?? 0
			let blockEnd = sorted[0]?.timeTo ?? 0
			const flushBlock = () => {
				const blockLength = blockEnd - blockStart
				if (blockLength > maxConsecutive) {
					longStudyBlocks += Math.ceil((blockLength - maxConsecutive) / 30)
				}
			}
			for (let i = 1; i < sorted.length; i++) {
				const unit = sorted[i]!
				if (unit.timeFrom - blockEnd <= 15) {
					blockEnd = Math.max(blockEnd, unit.timeTo)
				} else {
					flushBlock()
					blockStart = unit.timeFrom
					blockEnd = unit.timeTo
				}
			}
			if (sorted.length > 0) flushBlock()
		}
	}

	const total =
		campusConflicts * weights.campusConflict +
		gapMinutes * weights.gapMinutePenalty +
		offPreferredDays * weights.offPreferredDay +
		longStudyBlocks * weights.consecutiveBlockOverage

	return { campusConflicts, gapMinutes, offPreferredDays, longStudyBlocks, total }
}

// Tier + reasons presentation

/**
 * Quality tier for a scored candidate, best to worst. Consumed by the client
 * (and later API/MCP) to present timetable quality consistently. Purely derived
 * from a ScoreBreakdownDTO - this layer owns the rules, callers own the wording.
 */
export type ScoreTier = 'perfect' | 'good' | 'okay' | 'rough'

/**
 * Upper-bound totals (inclusive) for each non-perfect, non-rough tier. `perfect`
 * is total === 0 exactly; `rough` is anything above `okay`. Tunable in one place.
 */
export const SCORE_TIER_THRESHOLDS = {
	good: 45,
	okay: 100
} as const

/**
 * Best tier a candidate carrying >= 1 campus conflict may reach: a campus
 * conflict is disruptive enough that no low total can lift such a candidate
 * above this floor. Named here so it is tunable alongside the thresholds.
 */
export const CAMPUS_CONFLICT_TIER_FLOOR: ScoreTier = 'okay'

/** Tier ordering, best (index 0) to worst, for floor comparisons. */
const TIER_ORDER: readonly ScoreTier[] = ['perfect', 'good', 'okay', 'rough']

function baseTier(total: number): ScoreTier {
	if (total === 0) return 'perfect'
	if (total <= SCORE_TIER_THRESHOLDS.good) return 'good'
	if (total <= SCORE_TIER_THRESHOLDS.okay) return 'okay'
	return 'rough'
}

/**
 * Maps a ScoreBreakdownDTO to a quality tier. The campus-conflict floor caps any
 * candidate with >= 1 campus conflict at CAMPUS_CONFLICT_TIER_FLOOR: it can only
 * demote a better tier, never promote a worse one.
 */
export function scoreTier(breakdown: ScoreBreakdownDTO): ScoreTier {
	const tier = baseTier(breakdown.total)
	if (breakdown.campus_conflicts >= 1 && TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(CAMPUS_CONFLICT_TIER_FLOOR)) {
		return CAMPUS_CONFLICT_TIER_FLOOR
	}
	return tier
}

/**
 * Structured, i18n-free descriptor of one thing about a candidate worth
 * surfacing. Carries counts/minutes only - no localized strings, no formatting.
 * The client owns all wording.
 */
export type ScoreReason =
	| { kind: 'perfect' }
	| { kind: 'gaps'; minutes: number }
	| { kind: 'offPreferredDays'; count: number }
	| { kind: 'campusConflict'; count: number }
	| { kind: 'longStudyBlocks'; count: number }

/**
 * Maps a ScoreBreakdownDTO to structured reason descriptors. A zero-total
 * breakdown yields exactly `[{ kind: 'perfect' }]`; otherwise one reason is
 * emitted per non-zero component, in the order declared by ScoreReason.
 */
export function scoreReasons(breakdown: ScoreBreakdownDTO): ScoreReason[] {
	if (breakdown.total === 0) return [{ kind: 'perfect' }]

	const reasons: ScoreReason[] = []
	if (breakdown.gap_minutes > 0) reasons.push({ kind: 'gaps', minutes: breakdown.gap_minutes })
	if (breakdown.off_preferred_days > 0) reasons.push({ kind: 'offPreferredDays', count: breakdown.off_preferred_days })
	if (breakdown.campus_conflicts > 0) reasons.push({ kind: 'campusConflict', count: breakdown.campus_conflicts })
	if (breakdown.long_study_blocks > 0) reasons.push({ kind: 'longStudyBlocks', count: breakdown.long_study_blocks })
	return reasons
}

// Diversity filter

/**
 * Hamming-style distance between two assignments: the number of variable keys
 * (over the union of both assignments' keys) whose assigned slotId differs.
 */
function slotPickDistance(a: SolverAssignment, b: SolverAssignment): number {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)])
	let distance = 0
	for (const key of keys) {
		if (a[key]?.slotId !== b[key]?.slotId) distance++
	}
	return distance
}

/**
 * Skips candidates too similar to an already-kept candidate and returns at
 * most `maxResults`. The similarity threshold adapts to variable count:
 * ceil(variableCount / 6), floored at 2. This prevents the fixed threshold of
 * 2 from collapsing results to a single candidate when there is only one
 * variable (max possible distance = 1). Callers MUST pre-sort `candidates` by
 * ascending score before calling this — scanning in that order naturally
 * prefers better-scored candidates when near-duplicates are discarded.
 */
export function diversityFilter(candidates: SolverAssignment[], maxResults = 5): SolverAssignment[] {
	const kept: SolverAssignment[] = []
	const variableCount = candidates.length > 0 ? Object.keys(candidates[0]!).length : 0
	const minDistance = Math.max(2, Math.ceil(variableCount / 6))
	for (const candidate of candidates) {
		if (kept.length >= maxResults) break
		const tooSimilar = kept.some(k => slotPickDistance(k, candidate) < minDistance)
		if (!tooSimilar) kept.push(candidate)
	}
	return kept
}

export { checkCourseCompleteness }
