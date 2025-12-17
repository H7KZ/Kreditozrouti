import EventsAllValidation from '@api/Validations/EventsAllValidation'
import { z } from 'zod'

/**
 * Defines the query parameters for searching events.
 * Handles optional filtering by title, date ranges, and categories.
 *
 * @route GET /events/all
 */
type EventsAllRequest = z.infer<typeof EventsAllValidation>

export default EventsAllRequest
