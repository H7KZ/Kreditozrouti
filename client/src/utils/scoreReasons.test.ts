import type { ScoreReason } from '@kreditozrouti/core/domain/optimizer'
import { describe, expect, it } from 'vitest'
import { formatScoreReasons } from './scoreReasons'

// Deterministic fake translator: echoes the key and any interpolation params so
// the test can assert which locale keys and values the formatter reaches for,
// without booting vue-i18n. Real pluralization (Czech forms) is vue-i18n's job.
const t = (key: string, named?: Record<string, unknown>): string => (named ? `${key}|${JSON.stringify(named)}` : key)

describe('formatScoreReasons', () => {
	it('returns a single perfect reason for a perfect breakdown', () => {
		const reasons: ScoreReason[] = [{ kind: 'perfect' }]
		expect(formatScoreReasons(reasons, t)).toEqual(['components.optimizer.reasons.perfect'])
	})

	it('formats gap minutes below an hour as bare minutes', () => {
		const reasons: ScoreReason[] = [{ kind: 'gaps', minutes: 40 }]
		expect(formatScoreReasons(reasons, t)).toEqual(['components.optimizer.reasons.gaps|{"duration":"40 time.minutes"}'])
	})

	it('formats gap minutes of an hour or more as "Xh Ym" via time.hoursMinutes', () => {
		const reasons: ScoreReason[] = [{ kind: 'gaps', minutes: 90 }]
		expect(formatScoreReasons(reasons, t)).toEqual([
			'components.optimizer.reasons.gaps|{"duration":"time.hoursMinutes|{\\"hours\\":1,\\"minutes\\":30}"}'
		])
	})

	it('passes counts through for off-preferred-days, campus conflicts and long blocks', () => {
		const reasons: ScoreReason[] = [
			{ kind: 'offPreferredDays', count: 2 },
			{ kind: 'campusConflict', count: 1 },
			{ kind: 'longStudyBlocks', count: 3 }
		]
		expect(formatScoreReasons(reasons, t)).toEqual([
			'components.optimizer.reasons.offPreferredDays|{"count":2}',
			'components.optimizer.reasons.campusConflict|{"count":1}',
			'components.optimizer.reasons.longStudyBlocks|{"count":3}'
		])
	})

	it('preserves the order of the input reasons', () => {
		const reasons: ScoreReason[] = [
			{ kind: 'gaps', minutes: 30 },
			{ kind: 'campusConflict', count: 1 }
		]
		const out = formatScoreReasons(reasons, t)
		expect(out[0]).toContain('reasons.gaps')
		expect(out[1]).toContain('reasons.campusConflict')
	})

	it('returns an empty array for no reasons', () => {
		expect(formatScoreReasons([], t)).toEqual([])
	})
})
