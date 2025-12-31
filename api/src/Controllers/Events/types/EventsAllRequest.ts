import EventsAllValidation from '@api/Validations/EventsAllValidation'
import { z } from 'zod'

/**
 * Validated query parameters for retrieving all events.
 * Derived from the Zod validation schema.
 */
type EventsAllRequest = z.infer<typeof EventsAllValidation>

export default EventsAllRequest
