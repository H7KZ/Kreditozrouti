import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAnnouncerStore = defineStore('announcer', () => {
	const message = ref('')
	const politeness = ref<'polite' | 'assertive'>('polite')

	/**
	 * Announce a message to screen readers.
	 * @param msg - The localized message to announce.
	 * @param mode - Politeness level (default: polite).
	 */
	function announce(msg: string, mode: 'polite' | 'assertive' = 'polite') {
		// Reset message first to ensure screen readers re-read identical subsequent messages
		message.value = ''
		politeness.value = mode

		// Small delay to trigger DOM update
		setTimeout(() => {
			message.value = msg
		}, 50)
	}

	return { message, politeness, announce }
})
