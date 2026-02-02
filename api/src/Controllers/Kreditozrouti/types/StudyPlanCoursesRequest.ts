import StudyPlanCoursesFilterValidation from '@api/Validations/StudyPlanCoursesFilterValidation'
import { z } from 'zod'

/**
 * Documented inside `api/src/Validations/Validations/StudyPlanCoursesFilter.ts`
 */
type StudyPlanCoursesRequest = z.infer<typeof StudyPlanCoursesFilterValidation>
export default StudyPlanCoursesRequest
