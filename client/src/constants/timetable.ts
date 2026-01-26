import InSISDay from '@scraper/Types/InSISDay.ts'

// Days in order for the timetable grid
export const WEEKDAYS: InSISDay[] = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek']

export const ALL_DAYS: InSISDay[] = [...WEEKDAYS, 'Sobota', 'Neděle']

// Time grid configuration (in minutes from midnight)
export const TIME_CONFIG = {
	START: 7 * 60 + 30, // 7:30
	END: 20 * 60, // 20:00
	SLOT_DURATION: 45, // 45 minutes per slot
	BREAK_DURATION: 15, // 15 minutes break
} as const
