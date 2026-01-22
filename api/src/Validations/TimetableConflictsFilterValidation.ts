import * as z from 'zod'

const TimetableConflictsFilterValidation = z.object({
	selections: z.array(
		z.object({
			course_id: z.coerce.number(),
			slot_id: z.coerce.number()
		})
	)
})

export default TimetableConflictsFilterValidation

export type TimetableConflictsFilter = z.infer<typeof TimetableConflictsFilterValidation>
