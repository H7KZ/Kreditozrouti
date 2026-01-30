import { StorageKey } from '@client/constants/storage.ts'

/**
 * Save state to localStorage.
 *
 * @param key - Storage key
 * @param state - State to persist
 */
export function saveToStorage<T>(key: string | StorageKey, state: T): void {
	try {
		localStorage.setItem(key, JSON.stringify(state))
	} catch (e) {
		console.error(`Failed to save to localStorage (${key}):`, e)
	}
}

/**
 * Load state from localStorage.
 *
 * @param key - Storage key
 * @returns Parsed state or null if not found/invalid
 */
export function loadFromStorage<T>(key: string | StorageKey): T | null {
	try {
		const stored = localStorage.getItem(key)
		if (!stored) return null
		return JSON.parse(stored) as T
	} catch (e) {
		console.error(`Failed to load from localStorage (${key}):`, e)
		removeFromStorage(key)
		return null
	}
}

/**
 * Remove state from localStorage.
 *
 * @param key - Storage key
 */
export function removeFromStorage(key: string | StorageKey): void {
	localStorage.removeItem(key)
}

/**
 * Check if a key exists in localStorage.
 *
 * @param key - Storage key
 * @returns True if key exists
 */
export function hasInStorage(key: string | StorageKey): boolean {
	return localStorage.getItem(key) !== null
}
