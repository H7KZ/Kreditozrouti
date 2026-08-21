import type { FeedbackPayload } from '@client/types'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import analytics from '@client/analytics'

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
	 */
	function submit(payload: FeedbackPayload) {
		if (reported.value) {
			visible.value = false
			return
		}
		reported.value = true
		analytics.track('feedback', { thumbs: payload.thumbs })
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
