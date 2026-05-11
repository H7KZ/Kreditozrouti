/**
 * LocalStorage keys used by the application.
 */
export const STORAGE_KEYS = {
	TIMETABLE: 'kreditozrouti:timetable',
	SCHEDULE_SLOTS: 'kreditozrouti:schedule-slots',
	WIZARD: 'kreditozrouti:wizard',
	UI: 'kreditozrouti:ui',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
