import CoursesFilterValidation from '@api/Validations/CoursesFilterValidation'
import { z } from 'zod'

type CoursesRequest = z.infer<typeof CoursesFilterValidation>
export default CoursesRequest
