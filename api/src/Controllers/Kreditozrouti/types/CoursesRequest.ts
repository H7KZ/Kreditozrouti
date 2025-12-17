import CoursesFilterValidation from '@api/Validations/CoursesFilterValidation'
import { z } from 'zod'

/**
 * Defines the query parameters for searching and filtering courses.
 * Inferred from the Zod validation schema.
 *
 * @route GET /kreditozrouti/courses
 */
type CoursesRequest = z.infer<typeof CoursesFilterValidation>

export default CoursesRequest
