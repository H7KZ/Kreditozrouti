import { Event } from '@api/Database/types'

/**
 * Extended Event type including computed fields for signups.
 * This combines the DB schema with dynamic runtime data.
 */
export interface EventWithRegistration extends Event {
    registered_users_count: number | null
    user_registered: boolean
}

/**
 * Response payload for a single event retrieval.
 *
 * @route GET /events/:id
 */
export default interface EventResponse {
    /** The detailed record of the requested event with signup info. */
    event: EventWithRegistration
}
