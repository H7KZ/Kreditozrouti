import type { SelectedCourseUnit } from '@client/types'
import { ref } from 'vue'
import analytics from '@client/analytics'
import api from '@client/api'

export function useShareTimetable() {
	const sharing = ref(false)
	const shareUrl = ref<string | null>(null)

	async function shareTimetable(units: SelectedCourseUnit[]): Promise<string | null> {
		if (sharing.value || units.length === 0) return null
		sharing.value = true
		shareUrl.value = null

		try {
			const { data } = await api.post<{ id: string }>('/share', { units })
			const url = `${window.location.origin}/s/${data.id}`
			shareUrl.value = url
			await navigator.clipboard.writeText(url)
			analytics.track('share_created', { unit_count: units.length })
			return url
		} finally {
			sharing.value = false
		}
	}

	return { sharing, shareUrl, shareTimetable }
}
