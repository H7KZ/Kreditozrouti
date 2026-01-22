import TimetableConflictsFilterValidation from '@api/Validations/TimetableConflictsFilterValidation'
import { z } from 'zod'

/**
 * Documented inside `api/src/Validations/Validations/TimetableConflictsFilterValidation.ts`
 */
type TimetableConflictsRequest = z.infer<typeof TimetableConflictsFilterValidation>
export default TimetableConflictsRequest
