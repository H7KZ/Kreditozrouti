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
