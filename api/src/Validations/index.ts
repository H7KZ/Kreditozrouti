import { InSISDayValues } from '@scraper/Types/InSISDay'
import { InSISSemesterValues } from '@scraper/Types/InSISSemester'
import * as z from 'zod'

export const SemesterSchema = z.enum(InSISSemesterValues)

export const DaySchema = z.enum(InSISDayValues)

export const TimeSelectionSchema = z
	.object({
		day: DaySchema,
		time_from: z.coerce.number(),
		time_to: z.coerce.number()
	})
	.refine(data => data.time_from < data.time_to, {
		message: 'time_from must be less than time_to',
		path: ['time_from', 'time_to']
	})

export type TimeSelection = z.infer<typeof TimeSelectionSchema>
