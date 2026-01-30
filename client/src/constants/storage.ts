/**
 * LocalStorage keys used by the application.
 */
export const STORAGE_KEYS = {
	TIMETABLE: 'kreditozrouti:timetable',
	WIZARD: 'kreditozrouti:wizard',
	UI: 'kreditozrouti:ui',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
