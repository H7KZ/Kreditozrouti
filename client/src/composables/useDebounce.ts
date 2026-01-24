import { customRef, onUnmounted, ref, watch, type Ref } from 'vue'

/**
 * Create a debounced ref that delays updates
 */
export function useDebouncedRef<T>(initialValue: T, delay = 300): Ref<T> {
	let timeout: ReturnType<typeof setTimeout>

	return customRef((track, trigger) => ({
		get() {
			track()
			return initialValue
		},
		set(newValue) {
			clearTimeout(timeout)
			timeout = setTimeout(() => {
				initialValue = newValue
				trigger()
			}, delay)
		},
	}))
}

/**
 * Create a debounced version of a function
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
export function useDebounce<T extends (...args: any[]) => any>(fn: T, delay = 300) {
	let timeout: ReturnType<typeof setTimeout> | null = null

	const debouncedFn = (...args: Parameters<T>) => {
		if (timeout) {
			clearTimeout(timeout)
		}
		timeout = setTimeout(() => {
			fn(...args)
			timeout = null
		}, delay)
	}

	const cancel = () => {
		if (timeout) {
			clearTimeout(timeout)
			timeout = null
		}
	}

	const flush = (...args: Parameters<T>) => {
		cancel()
		fn(...args)
	}

	// Cleanup on unmount
	onUnmounted(() => {
		cancel()
	})

	return {
		fn: debouncedFn,
		cancel,
		flush,
	}
}

/**
 * Watch a ref and call a debounced callback when it changes
 */
export function useDebouncedWatch<T>(source: Ref<T>, callback: (value: T) => void, delay = 300) {
	const { fn: debouncedCallback, cancel } = useDebounce(callback, delay)

	const stop = watch(source, (newValue) => {
		debouncedCallback(newValue)
	})

	onUnmounted(() => {
		stop()
		cancel()
	})

	return {
		stop,
		cancel,
	}
}

/**
 * Create a search input with debounced updates
 * Returns both the immediate value (for display) and the debounced value (for API calls)
 */
export function useSearchInput(delay = 300) {
	const inputValue = ref('')
	const debouncedValue = ref('')
	const isDebouncing = ref(false)

	let timeout: ReturnType<typeof setTimeout> | null = null

	const updateValue = (value: string) => {
		inputValue.value = value
		isDebouncing.value = true

		if (timeout) {
			clearTimeout(timeout)
		}

		timeout = setTimeout(() => {
			debouncedValue.value = value
			isDebouncing.value = false
			timeout = null
		}, delay)
	}

	const clear = () => {
		if (timeout) {
			clearTimeout(timeout)
			timeout = null
		}
		inputValue.value = ''
		debouncedValue.value = ''
		isDebouncing.value = false
	}

	onUnmounted(() => {
		if (timeout) {
			clearTimeout(timeout)
		}
	})

	return {
		inputValue,
		debouncedValue,
		isDebouncing,
		updateValue,
		clear,
	}
}
