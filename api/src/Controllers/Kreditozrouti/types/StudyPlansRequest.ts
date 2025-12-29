import StudyPlansFilterValidation from '@api/Validations/StudyPlansFilterValidation'
import { z } from 'zod'

type StudyPlansRequest = z.infer<typeof StudyPlansFilterValidation>
export default StudyPlansRequest
