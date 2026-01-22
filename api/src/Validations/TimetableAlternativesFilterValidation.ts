import { TimetableSlotSchema } from '@api/Validations/index'
import * as z from 'zod'

const TimetableAlternativesFilterValidation = z.object({
	course_id: z.coerce.number(),
	current_slots: z.array(TimetableSlotSchema),
	limit: z.coerce.number().min(1).max(20).optional().default(5)
})

export default TimetableAlternativesFilterValidation

export type TimetableAlternativesFilter = z.infer<typeof TimetableAlternativesFilterValidation>
