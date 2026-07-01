import { describe, expect, it } from 'vitest'
import {
	DEFAULT_WEIGHTS,
	diversityFilter,
	scoreCandidate,
	solveWithDeadline
} from '@shared/domain/optimizer'
import type {
	ScoreBreakdown,
	SolverAssignment,
	SolverSlotCandidate,
	SolverVariable
} from '@shared/domain/optimizer'
import type { SolverConstraints } from '@shared/http/optimize'

function slot(overrides: Partial<SolverSlotCandidate> = {}): SolverSlotCandidate {
	return {
		day: 'monday',
		timeFrom: 480,
		timeTo: 560,
		location: 'RB.101',
		unitId: 1,
		slotId: 1,
		courseId: 1,
		unitType: 'lecture',
		...overrides
	}
}

describe('solveWithDeadline', () => {
	it('returns at least one complete assignment for a 2-variable problem with non-overlapping domains', () => {
		const variables: SolverVariable[] = [
			{
				courseId: 1,
				unitType: 'lecture',
				domain: [slot({ courseId: 1, unitId: 1, slotId: 1, day: 'monday', timeFrom: 480, timeTo: 560 })]
			},
			{
				courseId: 2,
				unitType: 'lecture',
				domain: [slot({ courseId: 2, unitId: 2, slotId: 2, day: 'tuesday', timeFrom: 480, timeTo: 560 })]
			}
		]

		const result = solveWithDeadline(variables, [], 1000)

		expect(result.candidates.length).toBeGreaterThanOrEqual(1)
		expect(result.partial).toBe(false)
		const candidate = result.candidates[0]
		expect(candidate['1:lecture']).toBeDefined()
		expect(candidate['2:lecture']).toBeDefined()
	})

	it('returns ZERO candidates when the only domain options hard-overlap on the same day/time', () => {
		const variables: SolverVariable[] = [
			{
				courseId: 1,
				unitType: 'lecture',
				domain: [slot({ courseId: 1, unitId: 1, slotId: 1, day: 'monday', timeFrom: 480, timeTo: 560, location: 'RB.101' })]
			},
			{
				courseId: 2,
				unitType: 'lecture',
				domain: [slot({ courseId: 2, unitId: 2, slotId: 2, day: 'monday', timeFrom: 500, timeTo: 580, location: 'RB.102' })]
			}
		]

		const result = solveWithDeadline(variables, [], 1000)

		expect(result.candidates).toEqual([])
	})

	it('still returns a complete candidate when the only schedule has a campus conflict (no time overlap)', () => {
		// JM (jizni-mesto) 480-540, RB (zizkov) 550-620 -> gap = 10min < 40min threshold, different campuses, no time overlap
		const variables: SolverVariable[] = [
			{
				courseId: 1,
				unitType: 'lecture',
				domain: [slot({ courseId: 1, unitId: 1, slotId: 1, day: 'monday', timeFrom: 480, timeTo: 540, location: 'JM.101' })]
			},
			{
				courseId: 2,
				unitType: 'lecture',
				domain: [slot({ courseId: 2, unitId: 2, slotId: 2, day: 'monday', timeFrom: 550, timeTo: 620, location: 'RB.101' })]
			}
		]

		const result = solveWithDeadline(variables, [], 1000)

		expect(result.candidates.length).toBe(1)
		const constraints: SolverConstraints = {}
		const breakdown = scoreCandidate(result.candidates[0], constraints)
		expect(breakdown.campusConflicts).toBeGreaterThanOrEqual(1)
	})

	it('sets partial:true and returns promptly given an already-past deadline, even with domain options available (does not hang)', () => {
		// Budget is deliberately negative so `deadline = Date.now() + budgetMs` is already in the
		// past before recursion starts — this is the "deadline already in the past" branch of the
		// in-recursion guard. (A literal `budgetMs: 0` is not a reliable trigger here: a trivial
		// 2-variable/2-option search can complete in under 1ms, i.e. before Date.now() ticks past
		// `deadline = Date.now() + 0`, which would make the assertion flaky rather than deterministic.)
		const variables: SolverVariable[] = [
			{
				courseId: 1,
				unitType: 'lecture',
				domain: [
					slot({ courseId: 1, unitId: 1, slotId: 1, day: 'monday', timeFrom: 480, timeTo: 540 }),
					slot({ courseId: 1, unitId: 2, slotId: 2, day: 'tuesday', timeFrom: 480, timeTo: 540 })
				]
			},
			{
				courseId: 2,
				unitType: 'lecture',
				domain: [
					slot({ courseId: 2, unitId: 3, slotId: 3, day: 'wednesday', timeFrom: 480, timeTo: 540 }),
					slot({ courseId: 2, unitId: 4, slotId: 4, day: 'thursday', timeFrom: 480, timeTo: 540 })
				]
			}
		]

		const start = Date.now()
		const result = solveWithDeadline(variables, [], -1)
		const elapsedMs = Date.now() - start

		expect(result.partial).toBe(true)
		expect(elapsedMs).toBeLessThan(1000)
	})

	it('sets partial:true when given a deadline already in the past', () => {
		const variables: SolverVariable[] = [
			{
				courseId: 1,
				unitType: 'lecture',
				domain: [slot({ courseId: 1, unitId: 1, slotId: 1 })]
			}
		]

		// Negative budget => deadline = Date.now() - N, already in the past
		const result = solveWithDeadline(variables, [], -1000)

		expect(result.partial).toBe(true)
	})
})

describe('scoreCandidate', () => {
	it('returns total === 0 and all-zero breakdown for a schedule with no soft-constraint violations', () => {
		const assignment: SolverAssignment = {
			'1:lecture': slot({ courseId: 1, unitId: 1, slotId: 1, day: 'monday', timeFrom: 480, timeTo: 560, location: 'RB.101' }),
			'2:lecture': slot({ courseId: 2, unitId: 2, slotId: 2, day: 'monday', timeFrom: 560, timeTo: 640, location: 'RB.102' })
		}
		const constraints: SolverConstraints = {}

		const breakdown: ScoreBreakdown = scoreCandidate(assignment, constraints)

		expect(breakdown).toEqual({
			campusConflicts: 0,
			gapMinutes: 0,
			offPreferredDays: 0,
			longStudyBlocks: 0,
			total: 0
		})
	})

	it("campus term equals campusConflicts * DEFAULT_WEIGHTS.campusConflict for a known 1-campus-conflict schedule", () => {
		const assignment: SolverAssignment = {
			'1:lecture': slot({ courseId: 1, unitId: 1, slotId: 1, day: 'monday', timeFrom: 480, timeTo: 540, location: 'JM.101' }),
			'2:lecture': slot({ courseId: 2, unitId: 2, slotId: 2, day: 'monday', timeFrom: 550, timeTo: 620, location: 'RB.101' })
		}
		const constraints: SolverConstraints = {}

		const breakdown = scoreCandidate(assignment, constraints)

		expect(breakdown.campusConflicts).toBe(1)
		expect(breakdown.campusConflicts * DEFAULT_WEIGHTS.campusConflict).toBeLessThanOrEqual(breakdown.total)
		expect(breakdown.campusConflicts * DEFAULT_WEIGHTS.campusConflict).toBe(1 * DEFAULT_WEIGHTS.campusConflict)
	})
})

describe('diversityFilter', () => {
	it('drops a near-duplicate (slot-pick distance < 2) and keeps distinct candidates, capping at maxResults', () => {
		const a: SolverAssignment = {
			'1:lecture': slot({ courseId: 1, unitId: 1, slotId: 1 }),
			'2:lecture': slot({ courseId: 2, unitId: 2, slotId: 2 })
		}
		// near-duplicate of `a`: only one variable's slotId differs => distance 1 (< 2)
		const aNearDuplicate: SolverAssignment = {
			'1:lecture': slot({ courseId: 1, unitId: 1, slotId: 1 }),
			'2:lecture': slot({ courseId: 2, unitId: 3, slotId: 3 })
		}
		// distinct candidate: both variables differ => distance 2 (>= 2)
		const b: SolverAssignment = {
			'1:lecture': slot({ courseId: 1, unitId: 4, slotId: 4 }),
			'2:lecture': slot({ courseId: 2, unitId: 5, slotId: 5 })
		}

		const result = diversityFilter([a, aNearDuplicate, b], 5)

		expect(result).toHaveLength(2)
		expect(result).toContainEqual(a)
		expect(result).toContainEqual(b)
		expect(result).not.toContainEqual(aNearDuplicate)
	})

	it('returns at most maxResults even when given more than that many distinct candidates', () => {
		const candidates: SolverAssignment[] = Array.from({ length: 8 }, (_, i) => ({
			'1:lecture': slot({ courseId: 1, unitId: i + 1, slotId: i + 1 })
		}))

		const result = diversityFilter(candidates, 5)

		expect(result.length).toBeLessThanOrEqual(5)
	})
})
