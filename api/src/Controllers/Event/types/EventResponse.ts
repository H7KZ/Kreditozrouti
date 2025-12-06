import { Event } from '@api/Database/types'

/**
 * Defines the response payload for a single event retrieval.
 * @route 200 /event/:id
 */
export default interface EventResponse {
    /** The detailed record of the requested event. */
    event: Event
}
