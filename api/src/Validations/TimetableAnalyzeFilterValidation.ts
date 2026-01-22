import { TimetableSlotSchema } from '@api/Validations/index'
import * as z from 'zod'

const TimetableAnalyzeFilterValidation = z.object({
	slots: z.array(TimetableSlotSchema)
})

export default TimetableAnalyzeFilterValidation

export type TimetableAnalyzeFilter = z.infer<typeof TimetableAnalyzeFilterValidation>
