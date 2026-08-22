import type { ScoreReason } from '@kreditozrouti/core/domain'
import type { ScoreBreakdownDTO } from '@kreditozrouti/types'
import { SCORE_TIER_THRESHOLDS, scoreReasons, scoreTier } from '@kreditozrouti/core/domain'
import { describe, expect, it } from 'vitest'

function breakdown(overrides: Partial<ScoreBreakdownDTO> = {}): ScoreBreakdownDTO {
	return {
		campus_conflicts: 0,
		gap_minutes: 0,
		off_preferred_days: 0,
		long_study_blocks: 0,
		total: 0,
		...overrides
	}
}

describe('scoreTier', () => {
	it('returns perfect only when total is exactly 0', () => {
		expect(scoreTier(breakdown({ total: 0 }))).toBe('perfect')
		expect(scoreTier(breakdown({ total: 1 }))).toBe('good')
	})

	it('returns good up to and including the good threshold', () => {
		expect(scoreTier(breakdown({ total: SCORE_TIER_THRESHOLDS.good }))).toBe('good')
		expect(scoreTier(breakdown({ total: SCORE_TIER_THRESHOLDS.good + 1 }))).toBe('okay')
	})

	it('returns okay up to and including the okay threshold', () => {
		expect(scoreTier(breakdown({ total: SCORE_TIER_THRESHOLDS.okay }))).toBe('okay')
		expect(scoreTier(breakdown({ total: SCORE_TIER_THRESHOLDS.okay + 1 }))).toBe('rough')
	})

	it('uses concrete boundary values 0, 45/46, 100/101', () => {
		expect(scoreTier(breakdown({ total: 0 }))).toBe('perfect')
		expect(scoreTier(breakdown({ total: 45 }))).toBe('good')
		expect(scoreTier(breakdown({ total: 46 }))).toBe('okay')
		expect(scoreTier(breakdown({ total: 100 }))).toBe('okay')
		expect(scoreTier(breakdown({ total: 101 }))).toBe('rough')
	})

	it('caps an otherwise-low-total candidate at okay when a campus conflict is present', () => {
		// total 0 would be perfect, but a campus conflict floors it at okay
		expect(scoreTier(breakdown({ total: 0, campus_conflicts: 1 }))).toBe('okay')
		// total 20 would be good, but the floor still applies
		expect(scoreTier(breakdown({ total: 20, campus_conflicts: 2 }))).toBe('okay')
	})

	it('leaves rough candidates rough even with campus conflicts (floor only caps upward)', () => {
		expect(scoreTier(breakdown({ total: 200, campus_conflicts: 1 }))).toBe('rough')
	})
})

describe('scoreReasons', () => {
	it('emits only the perfect reason for a zero breakdown', () => {
		const reasons = scoreReasons(breakdown({ total: 0 }))
		expect(reasons).toEqual<ScoreReason[]>([{ kind: 'perfect' }])
	})

	it('emits structured descriptor objects with correct counts and minutes', () => {
		const reasons = scoreReasons(
			breakdown({
				gap_minutes: 90,
				off_preferred_days: 2,
				campus_conflicts: 1,
				long_study_blocks: 3,
				total: 175
			})
		)

		expect(reasons).toContainEqual({ kind: 'gaps', minutes: 90 })
		expect(reasons).toContainEqual({ kind: 'offPreferredDays', count: 2 })
		expect(reasons).toContainEqual({ kind: 'campusConflict', count: 1 })
		expect(reasons).toContainEqual({ kind: 'longStudyBlocks', count: 3 })
		expect(reasons).not.toContainEqual({ kind: 'perfect' })
	})

	it('emits reasons in the order declared by ScoreReason', () => {
		const reasons = scoreReasons(
			breakdown({
				gap_minutes: 90,
				off_preferred_days: 2,
				campus_conflicts: 1,
				long_study_blocks: 3,
				total: 175
			})
		)

		expect(reasons).toEqual<ScoreReason[]>([
			{ kind: 'gaps', minutes: 90 },
			{ kind: 'offPreferredDays', count: 2 },
			{ kind: 'campusConflict', count: 1 },
			{ kind: 'longStudyBlocks', count: 3 }
		])
	})

	it('omits reasons whose component is zero', () => {
		const reasons = scoreReasons(breakdown({ gap_minutes: 30, total: 15 }))
		expect(reasons).toEqual<ScoreReason[]>([{ kind: 'gaps', minutes: 30 }])
	})

	it('emits no perfect reason when total is non-zero even if it were mislabeled', () => {
		const reasons = scoreReasons(breakdown({ campus_conflicts: 1, total: 50 }))
		expect(reasons.some(r => r.kind === 'perfect')).toBe(false)
	})
})
