import { createUnion, DaySchema } from '@api/Validations/index'
import { InSISSemesterValues } from '@scraper/Types/InSISSemester'
import * as z from 'zod'

const TimetableGenerateFilterValidation = z.object({
	study_plan_id: z.coerce.number(),
	semester: createUnion(z.enum(InSISSemesterValues)),
	year: z.coerce.number(),

	preferred_days: z.array(DaySchema).optional(),

	preferred_time_from: z.coerce.number().min(0).max(1440).optional(),
	preferred_time_to: z.coerce.number().min(0).max(1440).optional(),
	max_ects: z.coerce.number().optional(),
	include_electives: z.coerce.boolean().optional().default(false)
})

export default TimetableGenerateFilterValidation

export type TimetableGenerateFilter = z.infer<typeof TimetableGenerateFilterValidation>
