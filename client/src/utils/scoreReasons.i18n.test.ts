import type { ScoreReason } from '@kreditozrouti/core/domain/optimizer'
import type { Translate } from './scoreReasons'
import cs from '@client/locales/cs.json'
import en from '@client/locales/en.json'
import { czechPluralRule } from '@client/utils/pluralization'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import { formatScoreReasons } from './scoreReasons'

// Boots the real vue-i18n with the shipped locale messages and the Czech plural
// rule, so these assertions exercise the exact wording and plural selection the
// user sees - not a stub.
function translator(locale: 'en' | 'cs'): Translate {
	const i18n = createI18n({
		legacy: false,
		locale,
		fallbackLocale: 'en',
		messages: { en, cs },
		pluralRules: { cs: czechPluralRule }
	})
	return i18n.global.t as unknown as Translate
}

const en_ = translator('en')
const cs_ = translator('cs')

describe('formatScoreReasons with real i18n', () => {
	it('renders the perfect reason in both languages', () => {
		const perfect: ScoreReason[] = [{ kind: 'perfect' }]
		expect(formatScoreReasons(perfect, en_)).toEqual(['No gaps, no conflicts'])
		expect(formatScoreReasons(perfect, cs_)).toEqual(['Žádné mezery, žádné konflikty'])
	})

	it('formats gap durations as bare minutes or Xh Ym', () => {
		expect(formatScoreReasons([{ kind: 'gaps', minutes: 40 }], en_)).toEqual(['40 min gaps'])
		expect(formatScoreReasons([{ kind: 'gaps', minutes: 90 }], en_)).toEqual(['1h 30min gaps'])
	})

	it('uses English 2-way plurals for counts', () => {
		expect(formatScoreReasons([{ kind: 'offPreferredDays', count: 1 }], en_)).toEqual(['1 class on a non-preferred day'])
		expect(formatScoreReasons([{ kind: 'offPreferredDays', count: 3 }], en_)).toEqual(['3 classes on non-preferred days'])
		expect(formatScoreReasons([{ kind: 'campusConflict', count: 1 }], en_)).toEqual(['1 campus switch'])
		expect(formatScoreReasons([{ kind: 'campusConflict', count: 2 }], en_)).toEqual(['2 campus switches'])
	})

	it('uses Czech 3-way plurals (1 / 2-4 / 5+) for counts', () => {
		expect(formatScoreReasons([{ kind: 'campusConflict', count: 1 }], cs_)).toEqual(['1 přesun mezi kampusy'])
		expect(formatScoreReasons([{ kind: 'campusConflict', count: 2 }], cs_)).toEqual(['2 přesuny mezi kampusy'])
		expect(formatScoreReasons([{ kind: 'campusConflict', count: 5 }], cs_)).toEqual(['5 přesunů mezi kampusy'])

		expect(formatScoreReasons([{ kind: 'longStudyBlocks', count: 1 }], cs_)).toEqual(['1 dlouhý blok výuky'])
		expect(formatScoreReasons([{ kind: 'longStudyBlocks', count: 3 }], cs_)).toEqual(['3 dlouhé bloky výuky'])
		expect(formatScoreReasons([{ kind: 'longStudyBlocks', count: 8 }], cs_)).toEqual(['8 dlouhých bloků výuky'])
	})
})
