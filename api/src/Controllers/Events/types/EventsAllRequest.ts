import EventsAllValidation from '@api/Validations/EventsAllValidation'
import { z } from 'zod'

type EventsAllRequest = z.infer<typeof EventsAllValidation>
export default EventsAllRequest
