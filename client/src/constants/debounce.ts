/**
 * Debounce timings for various inputs (in milliseconds).
 */
export const DEBOUNCE_TIMING = {
	/** Search input debounce */
	SEARCH: 750,

	/** Resize handler debounce */
	RESIZE: 150,

	/** API request debounce */
	API: 300,
} as const
