import { InSISDayValues } from '@scraper/Types/InSISDay'
import { InSISSemesterValues } from '@scraper/Types/InSISSemester'
import * as z from 'zod'

export const SemesterSchema = z.enum(InSISSemesterValues)

export const DaySchema = z.enum(InSISDayValues)

export const TimeSelectionSchema = z
	.object({
		slot_id: z.number().optional(),
		day: DaySchema.nullable().optional(),
		date: z.coerce.date().nullable().optional(),
		time_from: z.coerce.number(),
		time_to: z.coerce.number()
	})
	.refine(data => (data.day ?? data.date) !== undefined, {
		message: 'Either day or date must be provided',
		path: ['day', 'date']
	})
	.refine(data => data.time_from < data.time_to, {
		message: 'time_from must be less than time_to',
		path: ['time_from', 'time_to']
	})

export type TimeSelection = z.infer<typeof TimeSelectionSchema>
