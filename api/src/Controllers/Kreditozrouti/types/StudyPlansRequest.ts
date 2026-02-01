import StudyPlansFilterValidation from '@api/Validations/StudyPlansFilterValidation'
import { z } from 'zod'

/**
 * Documented inside `api/src/Validations/Validations/StudyPlansFilterValidation.ts`
 */
type StudyPlansRequest = z.infer<typeof StudyPlansFilterValidation>
export default StudyPlansRequest
