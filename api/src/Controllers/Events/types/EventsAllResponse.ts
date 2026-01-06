import { EventWithRegistration } from './EventResponse'

/**
 * Response payload containing a list of events.
 *
 * @route GET /events/all
 */
export default interface EventsAllResponse {
    /** List of events matching the search criteria. */
    events: EventWithRegistration[]
}
