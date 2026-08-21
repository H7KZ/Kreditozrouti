import type { FeedbackPayload } from '@client/types'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import analytics from '@client/analytics'
import { sanitizeFeedbackMessage } from '@client/utils/feedback'

/**
 * Leaf store for the in-app feedback card.
 *
 * Imports no other store, so it can never create a dependency cycle - the same
 * shape as stores that already call `analytics` directly. It owns the card's
 * visibility plus the single-event reporting: `submit()` fires exactly one
 * `feedback` event, `dismiss()` closes without reporting.
 *
 * Walking skeleton (#156): the card is shown unconditionally so the wiring is
 * demoable. Eligibility, triggers, and persistence arrive in a later ticket.
 */
export const useFeedbackStore = defineStore('feedback', () => {
	const visible = ref(true)

	// Guards the "exactly one event" rule: once an event has fired for the
	// current card, neither a second submit nor a close can fire another.
	const reported = ref(false)

	/**
	 * Report the chosen sentiment as a single `feedback` analytics event and
	 * close the card. No-op if an event has already been reported.
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
		visible.value = false
	}

	/**
	 * Close the card without reporting anything.
	 */
	function dismiss() {
		visible.value = false
	}

	return {
		visible,
		submit,
		dismiss
	}
})
