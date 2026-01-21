import type { TimetableDay } from '@client/types/schedule'

// Days of the week (Czech abbreviations matching InSIS)
export const TIMETABLE_DAYS: TimetableDay[] = [
	{ key: 'Po', label: 'Pondělí', shortLabel: 'Po' },
	{ key: 'Út', label: 'Úterý', shortLabel: 'Út' },
	{ key: 'St', label: 'Středa', shortLabel: 'St' },
	{ key: 'Čt', label: 'Čtvrtek', shortLabel: 'Čt' },
	{ key: 'Pá', label: 'Pátek', shortLabel: 'Pá' },
]

// Time column headers for timetable (InSIS style 45-min blocks)
export const TIMETABLE_TIME_SLOTS = [
	{ start: 495, label: '08:15-09:00' },
	{ start: 555, label: '09:15-10:00' },
	{ start: 600, label: '10:00-10:45' },
	{ start: 660, label: '11:00-11:45' },
	{ start: 705, label: '11:45-12:30' },
	{ start: 765, label: '12:45-13:30' },
	{ start: 810, label: '13:30-14:15' },
	{ start: 870, label: '14:30-15:15' },
	{ start: 915, label: '15:15-16:00' },
	{ start: 975, label: '16:15-17:00' },
	{ start: 1020, label: '17:00-17:45' },
]

// Color palette for courses (InSIS green as primary)
export const COURSE_COLORS = [
	'#90EE90', // Light green (primary)
	'#87CEEB', // Sky blue
	'#DDA0DD', // Plum
	'#F0E68C', // Khaki
	'#FFA07A', // Light salmon
	'#98FB98', // Pale green
	'#ADD8E6', // Light blue
	'#FFB6C1', // Light pink
	'#E6E6FA', // Lavender
	'#FFDAB9', // Peach puff
]

// Default time range (7:00 - 20:00)
export const DEFAULT_TIME_FROM = 420
export const DEFAULT_TIME_TO = 1200

// Helper: minutes to time string
export function minutesToTime(minutes: number): string {
	const h = Math.floor(minutes / 60)
	const m = minutes % 60
	return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// Helper: time string to minutes
export function timeToMinutes(time: string): number {
	const [h, m] = time.split(':').map(Number)
	if (!h || !m) return 0
	return h * 60 + m
}
