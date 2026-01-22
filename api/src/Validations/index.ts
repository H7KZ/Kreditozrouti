import { InSISDayValues } from '@scraper/Types/InSISDay'
import { InSISSemesterValues } from '@scraper/Types/InSISSemester'
import * as z from 'zod'

export const createUnion = <T extends z.ZodTypeAny>(schema: T) => z.union([schema, z.array(schema)]).optional()

export const StringOrArray = createUnion(z.string())
export const NumberOrArray = createUnion(z.coerce.number())

export const SemesterSchema = z.enum(InSISSemesterValues)

export const DaySchema = z.enum(InSISDayValues)

export const TimeSelectionSchema = z.object({
	day: z.enum(InSISDayValues),
	time_from: z.coerce.number(),
	time_to: z.coerce.number()
})

export const TimetableSlotSchema = z
	.object({
		course_id: z.coerce.number(),
		course_ident: z.string(),
		unit_id: z.coerce.number(),
		slot_id: z.coerce.number(),
		day: DaySchema,
		time_from: z.coerce.number().min(0).max(1440).default(0),
		time_to: z.coerce.number().min(0).max(1440).default(1440),
		location: z.string().nullable().optional(),
		lecturer: z.string().nullable().optional()
	})
	.refine(
		data => {
			if (data.time_from !== undefined && data.time_to !== undefined) {
				return data.time_from < data.time_to
			}

			return true
		},
		{
			message: 'time_from must be less than time_to',
			path: ['time_from']
		}
	)
