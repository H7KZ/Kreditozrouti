import type { FitResult } from './useFitScore'
import { describe, expect, it } from 'vitest'
import { fitChipFor } from './useFitScore'

describe('fitChipFor', () => {
	it('returns the fills_gap chip for a gap-filler fit', () => {
		expect(fitChipFor('fills_gap')).toBe('fills_gap')
	})

	it('returns the same_day chip for a same-day fit', () => {
		expect(fitChipFor('same_day')).toBe('same_day')
	})

	it('returns no chip for a new-day fit', () => {
		expect(fitChipFor('new_day')).toBeNull()
	})

	it('returns no chip for a neutral fit (also the no-fit reason)', () => {
		expect(fitChipFor('neutral')).toBeNull()
	})

	it('covers every fit reason', () => {
		const reasons: FitResult['fitReason'][] = ['fills_gap', 'same_day', 'new_day', 'neutral']
		const chips = reasons.map(fitChipFor)
		// Exactly the two positive cases produce a chip.
		expect(chips.filter(c => c !== null)).toEqual(['fills_gap', 'same_day'])
	})
})
