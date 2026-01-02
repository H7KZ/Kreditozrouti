import CoursesFilterValidation from '@api/Validations/CoursesFilterValidation'
import { z } from 'zod'

/**
 * Validated query parameters for the course catalog search.
 * Derived from the Zod validation schema.
 */
type CoursesRequest = z.infer<typeof CoursesFilterValidation>

export default CoursesRequest
