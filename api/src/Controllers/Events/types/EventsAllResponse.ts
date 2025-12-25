import { Event } from '@api/Database/types'

/**
 * Defines the response payload containing a list of events.
 * @route 200 /events/all
 */
export default interface EventsAllResponse {
    /** An array of event records matching the search criteria. */
    events: Event[]
}
