import type InSISDay from '@scraper/Types/InSISDay'
import { InSISDayValues } from '@scraper/Types/InSISDay'

/**
 * Weekdays for the timetable grid (Monday to Friday).
 */
export const WEEKDAYS: InSISDay[] = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek']

/**
 * All days of the week (including weekend).
 */
export const ALL_DAYS: InSISDay[] = [...WEEKDAYS, 'Sobota', 'Neděle']

/**
 * Days in chronological order - derived from InSIS types.
 * Use this for sorting operations.
 */
export const DAYS_ORDER: readonly InSISDay[] = InSISDayValues

/**
 * Time grid configuration (all values in minutes from midnight).
 */
export const TIME_CONFIG = {
	/** Start of timetable day (7:30 AM) */
	START: 7 * 60 + 30,

	/** End of timetable day (8:00 PM) */
	END: 20 * 60,

	/** Duration of a single teaching slot */
	SLOT_DURATION: 45,

	/** Break duration between slots */
	BREAK_DURATION: 15,
} as const

/**
 * Type for TIME_CONFIG values.
 */
export type TimeConfig = typeof TIME_CONFIG

/**
 * Default row height in pixels for timetable grid.
 */
export const GRID_ROW_HEIGHT = 60

/**
 * Padding from row edges in pixels for course blocks.
 */
export const GRID_BLOCK_PADDING = 2

/**
 * Minimum drag distance (pixels) to trigger drag selection.
 */
export const DRAG_THRESHOLD = 20

/**
 * Time snap interval for drag selection (in minutes).
 */
export const TIME_SNAP_INTERVAL = 15
