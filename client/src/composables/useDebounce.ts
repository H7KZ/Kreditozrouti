import { onUnmounted, ref, watch, type Ref } from 'vue'

export interface UseDebounceOptions {
	/** Delay in milliseconds (default: 300) */
	delay?: number
	/** Immediate execution on first call */
	immediate?: boolean
}

/**
 * Creates a debounced ref value.
 *
 * @example
 * ```ts
 * const { value, debouncedValue, cancel } = useDebounce('', { delay: 500 })
 *
 * // In template: v-model="value"
 * // Watch debouncedValue for API calls
 * watch(debouncedValue, (newVal) => fetchResults(newVal))
 * ```
 */
export function useDebounce<T>(initialValue: T, options: UseDebounceOptions = {}) {
	const { delay = 300, immediate = false } = options

	const value = ref<T>(initialValue) as Ref<T>
	const debouncedValue = ref<T>(initialValue) as Ref<T>
	const timeoutId = ref<number | null>(null)

	function cancel() {
		if (timeoutId.value !== null) {
			clearTimeout(timeoutId.value)
			timeoutId.value = null
		}
	}

	function flush() {
		cancel()
		debouncedValue.value = value.value
	}

	watch(
		value,
		(newValue) => {
			cancel()

			if (immediate && timeoutId.value === null) {
				debouncedValue.value = newValue
			}

			timeoutId.value = window.setTimeout(() => {
				debouncedValue.value = newValue
				timeoutId.value = null
			}, delay)
		},
		{ immediate: false },
	)

	onUnmounted(cancel)

	return {
		/** Current value (bind to input) */
		value,
		/** Debounced value (use for API calls) */
		debouncedValue,
		/** Cancel pending debounce */
		cancel,
		/** Immediately flush the debounced value */
		flush,
	}
}

/**
 * Creates a debounced callback function.
 *
 * @example
 * ```ts
 * const debouncedSearch = useDebouncedFn((query: string) => {
 *   fetchResults(query)
 * }, 500)
 *
 * // Call normally - will be debounced
 * debouncedSearch('test')
 * ```
 */
export function useDebouncedFn<T extends (...args: Parameters<T>) => void>(fn: T, delay = 300) {
	const timeoutId = ref<number | null>(null)

	function cancel() {
		if (timeoutId.value !== null) {
			clearTimeout(timeoutId.value)
			timeoutId.value = null
		}
	}

	function debouncedFn(...args: Parameters<T>) {
		cancel()
		timeoutId.value = window.setTimeout(() => {
			fn(...args)
			timeoutId.value = null
		}, delay)
	}

	onUnmounted(cancel)

	return Object.assign(debouncedFn, { cancel })
}
