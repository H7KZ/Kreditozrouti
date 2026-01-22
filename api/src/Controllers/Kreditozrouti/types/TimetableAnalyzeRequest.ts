import TimetableAnalyzeFilterValidation from '@api/Validations/TimetableAnalyzeFilterValidation'
import { z } from 'zod'

/**
 * Documented inside `api/src/Validations/Validations/TimetableAnalyzeFilterValidation.ts`
 */
type TimetableAnalyzeRequest = z.infer<typeof TimetableAnalyzeFilterValidation>
export default TimetableAnalyzeRequest
