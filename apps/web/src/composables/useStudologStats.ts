import type { StudologStatsDTO } from '@kreditozrouti/types'
import type { MaybeRefOrGetter } from 'vue'
import { computed, ref, toValue, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchStudologStats } from '@web/services'

const DIFFICULTY_KEYS: Record<string, string> = {
	dávačka: 'giveaway',
	lehké: 'easy',
	střední: 'medium',
	těžké: 'hard'
}

/**
 * Student ratings for one course, loaded when a course row is expanded.
 * Stays null while loading and when Studolog has nothing to show, so callers render nothing.
 */
export function useStudologStats(ident: MaybeRefOrGetter<string>) {
	const { locale, t } = useI18n()

	const stats = ref<StudologStatsDTO | null>(null)

	watch(
		() => toValue(ident),
		async (current, _previous, onCleanup) => {
			let stale = false
			onCleanup(() => (stale = true))

			stats.value = null
			const loaded = await fetchStudologStats(current)
			if (!stale) stats.value = loaded
		},
		{ immediate: true }
	)

	const scoreLabel = computed(() => {
		const score = stats.value?.score
		if (score == null) return null
		return score.toLocaleString(locale.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
	})

	const difficultyLabel = computed(() => {
		const difficulty = stats.value?.difficulty
		if (!difficulty) return null
		const key = DIFFICULTY_KEYS[difficulty]
		return key ? t(`components.courses.CourseRowExpanded.studologDifficulty.${key}`) : difficulty
	})

	return { stats, scoreLabel, difficultyLabel }
}
