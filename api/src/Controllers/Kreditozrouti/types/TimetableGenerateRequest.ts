import TimetableGenerateFilterValidation from '@api/Validations/TimetableGenerateFilterValidation'
import { z } from 'zod'

/**
 * Documented inside `api/src/Validations/Validations/TimetableGenerateFilterValidation.ts`
 */
type TimetableGenerateRequest = z.infer<typeof TimetableGenerateFilterValidation>
export default TimetableGenerateRequest
