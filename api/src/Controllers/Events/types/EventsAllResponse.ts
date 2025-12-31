import { Event } from '@api/Database/types'

/**
 * Response payload containing a list of events.
 *
 * @route GET /events/all
 */
export default interface EventsAllResponse {
    /** List of events matching the search criteria. */
    events: Event[]
}
