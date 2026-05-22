import { onUnmounted, readonly, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchCourses, RateLimitedError, triggerCourseScrape } from '@client/services'
import { useCoursesStore } from '@client/stores'

type RefreshState = 'idle' | 'triggering' | 'streaming' | 'done' | 'error' | 'rate_limited'

const RATE_LIMIT_MS = 10 * 60 * 1000
const STORAGE_PREFIX = 'kreditozrouti:scrape:'

export function useCourseRefresh(courseId: number) {
	const { t } = useI18n()
	const coursesStore = useCoursesStore()

	const state = ref<RefreshState>('idle')
	const errorMessage = ref<string | null>(null)
	const rateLimitedUntil = ref<Date | null>(null)
	const rateLimitCountdown = ref('')
	const lastRefreshedAt = ref<Date | null>(null)

	let eventSource: EventSource | null = null
	let doneTimer: ReturnType<typeof setTimeout> | null = null
	let countdownInterval: ReturnType<typeof setInterval> | null = null

	function storageKey(): string {
		return STORAGE_PREFIX + courseId
	}

	function loadStoredState(): void {
		try {
			const raw = sessionStorage.getItem(storageKey())
			if (!raw) return
			const { triggeredAt } = JSON.parse(raw) as { triggeredAt: number }
			const until = triggeredAt + RATE_LIMIT_MS
			if (Date.now() < until) {
				rateLimitedUntil.value = new Date(until)
				state.value = 'rate_limited'
				startCountdown()
			} else {
				sessionStorage.removeItem(storageKey())
			}
		} catch {
			// ignore corrupt storage entries
		}
	}

	function saveTriggeredAt(): void {
		sessionStorage.setItem(storageKey(), JSON.stringify({ triggeredAt: Date.now() }))
	}

	function updateCountdown(): void {
		if (!rateLimitedUntil.value) return
		const remaining = rateLimitedUntil.value.getTime() - Date.now()
		if (remaining <= 0) {
			rateLimitCountdown.value = ''
			return
		}
		const minutes = Math.floor(remaining / 60000)
		const seconds = Math.floor((remaining % 60000) / 1000)
		rateLimitCountdown.value =
			minutes > 0
				? t('components.courses.CourseRefreshButton.countdownMinutes', { minutes, seconds })
				: t('components.courses.CourseRefreshButton.countdownSeconds', { seconds })
	}

	function startCountdown(): void {
		if (countdownInterval) clearInterval(countdownInterval)
		updateCountdown()
		countdownInterval = setInterval(() => {
			if (!rateLimitedUntil.value || Date.now() >= rateLimitedUntil.value.getTime()) {
				clearInterval(countdownInterval!)
				countdownInterval = null
				rateLimitedUntil.value = null
				state.value = 'idle'
				rateLimitCountdown.value = ''
				sessionStorage.removeItem(storageKey())
			} else {
				updateCountdown()
			}
		}, 1000)
	}

	function dismiss(): void {
		if (state.value === 'error') {
			state.value = 'idle'
			errorMessage.value = null
		}
	}

	async function trigger(): Promise<void> {
		if (state.value !== 'idle') return

		state.value = 'triggering'
		errorMessage.value = null

		try {
			await triggerCourseScrape(courseId)
			saveTriggeredAt()
			rateLimitedUntil.value = new Date(Date.now() + RATE_LIMIT_MS)
			state.value = 'streaming'
			openSSE()
		} catch (err) {
			if (err instanceof RateLimitedError) {
				saveTriggeredAt()
				rateLimitedUntil.value = new Date(Date.now() + RATE_LIMIT_MS)
				state.value = 'rate_limited'
				startCountdown()
			} else {
				const message = err instanceof Error ? err.message : null
				errorMessage.value = message ?? t('components.courses.CourseRefreshButton.unknownError')
				state.value = 'error'
			}
		}
	}

	function openSSE(): void {
		const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'
		eventSource = new EventSource(`${apiBase}/courses/${courseId}/scrape/status`)

		eventSource.addEventListener('complete', async () => {
			closeSSE()
			state.value = 'done'
			lastRefreshedAt.value = new Date()

			// Patch only the affected course in place — a full fetchCourses() would replace
			// the entire list, disrupting pagination, row expansion, and status badges.
			try {
				const result = await fetchCourses({ ids: [courseId], limit: 1 })
				const [updated] = result.data
				if (updated) {
					coursesStore.updateCourse(updated)
				}
			} catch {
				// Silently ignore — the stale data will refresh on the next normal fetch
			}

			doneTimer = setTimeout(() => {
				state.value = 'rate_limited'
				startCountdown()
			}, 3000)
		})

		eventSource.addEventListener('error', (event) => {
			if (event instanceof MessageEvent && event.data) {
				// Server-sent named 'error' event (e.g. TIMEOUT)
				closeSSE()
				try {
					const data = JSON.parse(event.data) as { message?: string }
					errorMessage.value = data.message ?? t('components.courses.CourseRefreshButton.timeoutError')
				} catch {
					errorMessage.value = t('components.courses.CourseRefreshButton.timeoutError')
				}
				state.value = 'error'
			} else if (state.value === 'streaming') {
				// Connection-level error
				closeSSE()
				errorMessage.value = t('components.courses.CourseRefreshButton.connectionError')
				state.value = 'error'
			}
		})
	}

	function closeSSE(): void {
		if (eventSource) {
			eventSource.close()
			eventSource = null
		}
	}

	function cleanup(): void {
		closeSSE()
		if (doneTimer) clearTimeout(doneTimer)
		if (countdownInterval) clearInterval(countdownInterval)
	}

	onUnmounted(cleanup)
	loadStoredState()

	return {
		state: readonly(state),
		errorMessage: readonly(errorMessage),
		rateLimitedUntil: readonly(rateLimitedUntil),
		rateLimitCountdown: readonly(rateLimitCountdown),
		lastRefreshedAt: readonly(lastRefreshedAt),
		dismiss,
		trigger,
	}
}
