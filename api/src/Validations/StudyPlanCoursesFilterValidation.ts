import * as z from 'zod'

const StudyPlanCoursesFilterValidation = z.object({
	study_plan_ids: z.array(z.coerce.number())
})

export default StudyPlanCoursesFilterValidation

export type StudyPlanCoursesFilter = z.infer<typeof StudyPlanCoursesFilterValidation>
