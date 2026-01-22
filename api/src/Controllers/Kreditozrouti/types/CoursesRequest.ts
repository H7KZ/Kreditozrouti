import CoursesFilterValidation from '@api/Validations/CoursesFilterValidation'
import { z } from 'zod'

/**
 * Documented inside `api/src/Validations/Validations/CoursesFilterValidation.ts`
 */
type CoursesRequest = z.infer<typeof CoursesFilterValidation>
export default CoursesRequest
