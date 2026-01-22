import { TimeSelectionSchema, TimetableSlotSchema } from '@api/Validations'
import * as z from 'zod'

/**
 * Time slot conflict representation.
 */
export interface TimetableTimeConflict {
	day: string
	time_from?: number | null
	time_to?: number | null
	course_id: number
	course_ident: string
	slot_id: number
}

/**
 * Timetable slot selection.
 */
export type TimetableSlot = z.infer<typeof TimetableSlotSchema>

export type TimeSelection = z.infer<typeof TimeSelectionSchema>

/**
 * Generated timetable result.
 */
export interface TimetableGenerated {
	slots: TimetableSlot[]
	total_ects: number
	total_hours: number
	conflicts: TimetableTimeConflict[]
	warnings: string[]
	coverage: {
		compulsory_fulfilled: boolean
		missing_compulsory: string[]
		elective_count: number
	}
}
