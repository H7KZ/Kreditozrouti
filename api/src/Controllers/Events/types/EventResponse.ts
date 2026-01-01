import { Event } from '@api/Database/types'

/**
 * Response payload for a single event retrieval.
 *
 * @route GET /events/:id
 */
export default interface EventResponse {
    /** The detailed record of the requested event. */
    event: Event
}
