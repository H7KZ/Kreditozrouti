import { Event } from '@api/Database/types'

/**
 * Interface representing a response for fetching all events
 *
 * @route 200 /events/all
 */
export default interface EventsAllResponse {
    /**
     * Array of event objects
     *
     * @type {Event[]}
     */
    events: Event[]
}
