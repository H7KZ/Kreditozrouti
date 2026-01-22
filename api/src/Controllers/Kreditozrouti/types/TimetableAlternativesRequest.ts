import TimetableAlternativesFilterValidation from '@api/Validations/TimetableAlternativesFilterValidation'
import { z } from 'zod'

/**
 * Documented inside `api/src/Validations/Validations/TimetableAlternativesFilterValidation.ts`
 */
type TimetableAlternativesRequest = z.infer<typeof TimetableAlternativesFilterValidation>
export default TimetableAlternativesRequest
