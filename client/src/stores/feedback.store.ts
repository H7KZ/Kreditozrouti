import type { FeedbackPayload, PersistedFeedbackState } from '@client/types'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import analytics from '@client/analytics'
import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { decideFeedbackPrompt, defaultFeedbackState, recordVisitDay, sanitizeFeedbackMessage, toLocalISODate } from '@client/utils/feedback'
import { loadFromStorage, saveToStorage } from '@client/utils/localstorage'

/** Fallback trigger delay: show after ~90s of the current visit if no save triggered it. */
const FALLBACK_DELAY_MS = 90 * 1000

/**
 * Leaf store for the in-app feedback card.
 *
 * Imports no other store, so it can never create a dependency cycle - the same
 * shape as stores that already call `analytics` directly. It owns the eligibility
 * gate (via the pure `decideFeedbackPrompt`), the persisted state, the card's
 * visibility, and the single-event reporting.
 *
 * The card appears only for a returning, eligible user (>= 2 distinct visit
 * days, not within the dismissal cooldown, not already submitted) and at most
 * once per session: on the first schedule save via `registerKeyAction()`, or
 * via a ~90s fallback timer armed in `recordVisit()`.
 */
export const useFeedbackStore = defineStore('feedback', () => {
	const visible = ref(false)

	// Session-scoped: the card shows at most once per session, and an event
	// fires at most once for the shown card.
	const shownThisSession = ref(false)
	const reported = ref(false)

	let state: PersistedFeedbackState = defaultFeedbackState()

	function persist() {
		saveToStorage<PersistedFeedbackState>(STORAGE_KEYS.FEEDBACK, state)
	}

	function hydrate() {
		const stored = loadFromStorage<PersistedFeedbackState>(STORAGE_KEYS.FEEDBACK)
		if (stored) state = { ...defaultFeedbackState(), ...stored }
	}

	// Show the card if eligible and not yet shown this session. Showing consumes
	// nothing - it persists no state and starts no cooldown.
	function maybeShow() {
		if (shownThisSession.value) return
		if (!decideFeedbackPrompt(state, Date.now())) return
		shownThisSession.value = true
		visible.value = true
	}

	/**
	 * Called once from the app root. Records today's visit into the persisted
	 * day-set and arms the fallback trigger.
	 */
	function recordVisit() {
		hydrate()
		state = recordVisitDay(state, toLocalISODate(new Date()))
		persist()
		// Singleton store - the timer lives for the session, no cleanup needed.
		setTimeout(maybeShow, FALLBACK_DELAY_MS)
	}

	/**
	 * Primary trigger entry point. The schedule-slots store calls this after a
	 * successful save (one-directional edge; this store imports nothing back).
	 */
	function registerKeyAction() {
		maybeShow()
	}

	/**
	 * Report the chosen sentiment as a single `feedback` analytics event, set the
	 * permanent submitted flag, and close the card. No-op if an event has already
	 * been reported.
	 *
	 * `rating` is sent as a JS number (stored numerically by Umami) and omitted
	 * when not chosen; `message` is trimmed/guarded and omitted when empty.
	 */
	function submit(payload: FeedbackPayload) {
		if (reported.value) {
			visible.value = false
			return
		}
		reported.value = true

		const data: Record<string, string | number> = { thumbs: payload.thumbs }
		if (payload.rating != null) data.rating = payload.rating
		const message = payload.message != null ? sanitizeFeedbackMessage(payload.message) : undefined
		if (message) data.message = message

		analytics.track('feedback', data)

		state = { ...state, submitted: true }
		persist()
		visible.value = false
	}

	/**
	 * Close the card without reporting, and start the 90-day cooldown.
	 */
	function dismiss() {
		state = { ...state, dismissedAt: Date.now() }
		persist()
		visible.value = false
	}

	return {
		visible,
		recordVisit,
		registerKeyAction,
		submit,
		dismiss
	}
})
