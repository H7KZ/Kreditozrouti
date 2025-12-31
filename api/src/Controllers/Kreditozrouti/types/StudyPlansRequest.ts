import StudyPlansFilterValidation from '@api/Validations/StudyPlansFilterValidation'
import { z } from 'zod'

/**
 * Validated query parameters for the study plans search.
 * Derived from the Zod validation schema.
 */
type StudyPlansRequest = z.infer<typeof StudyPlansFilterValidation>

export default StudyPlansRequest
