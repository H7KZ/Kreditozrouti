import type { ScoreReason } from '@kreditozrouti/core/domain/optimizer'

/**
 * Minimal translator signature - matches vue-i18n's `t(key, named, plural)`. The
 * explicit `plural` number is what selects the form (English 2-way, Czech 3-way
 * via czechPluralRule); `named` carries the `{count}` interpolation value.
 */
export type Translate = (key: string, named?: Record<string, unknown>, plural?: number) => string

const REASONS = 'components.optimizer.reasons'

/**
 * Formats a gap duration (minutes) the same way the timetable drag popover does:
 * bare minutes below an hour, otherwise the "Xh Ym" time.hoursMinutes template.
 */
function formatDuration(minutes: number, t: Translate): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	if (hours === 0) return `${mins} ${t('time.minutes')}`
	return t('time.hoursMinutes', { hours, minutes: mins })
}

/**
 * Turns the core, i18n-free ScoreReason[] into localized display strings, in the
 * order given. The core owns the rules and counts; this owns the wording, so the
 * two client consumers (results grid, explorer) render reasons identically.
 * Reuses the existing time.hoursMinutes duration helper and vue-i18n plural forms.
 */
export function formatScoreReasons(reasons: ScoreReason[], t: Translate): string[] {
	return reasons.map(reason => {
		switch (reason.kind) {
			case 'perfect':
				return t(`${REASONS}.perfect`)
			case 'gaps':
				return t(`${REASONS}.gaps`, { duration: formatDuration(reason.minutes, t) })
			case 'offPreferredDays':
				return t(`${REASONS}.offPreferredDays`, { count: reason.count }, reason.count)
			case 'campusConflict':
				return t(`${REASONS}.campusConflict`, { count: reason.count }, reason.count)
			case 'longStudyBlocks':
				return t(`${REASONS}.longStudyBlocks`, { count: reason.count }, reason.count)
		}
	})
}
