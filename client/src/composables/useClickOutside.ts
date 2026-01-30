import { onMounted, onUnmounted, type Ref } from 'vue'

export interface UseClickOutsideOptions {
	/** Callback when click outside is detected */
	onClickOutside?: () => void
	/** Callback when escape key is pressed */
	onEscape?: () => void
	/** Delay before attaching listeners (useful for preventing immediate trigger) */
	delay?: number
}

/**
 * Composable for handling click outside and escape key events.
 *
 * @example
 * ```ts
 * const popoverRef = ref<HTMLElement | null>(null)
 *
 * useClickOutside(popoverRef, {
 *   onClickOutside: () => emit('cancel'),
 *   onEscape: () => emit('cancel'),
 * })
 * ```
 */
export function useClickOutside(elementRef: Ref<HTMLElement | null>, options: UseClickOutsideOptions = {}) {
	const { onClickOutside, onEscape, delay = 0 } = options

	function handleClickOutside(event: MouseEvent) {
		if (elementRef.value && !elementRef.value.contains(event.target as Node)) {
			onClickOutside?.()
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onEscape?.()
		}
	}

	onMounted(() => {
		setTimeout(() => {
			if (onClickOutside) {
				document.addEventListener('click', handleClickOutside)
			}
			if (onEscape) {
				document.addEventListener('keydown', handleKeyDown)
			}
		}, delay)
	})

	onUnmounted(() => {
		document.removeEventListener('click', handleClickOutside)
		document.removeEventListener('keydown', handleKeyDown)
	})

	return {
		handleClickOutside,
		handleKeyDown,
	}
}
