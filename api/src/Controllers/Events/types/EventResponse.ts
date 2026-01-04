import { Event } from '@api/Database/types'

/**
 * Extended Event type including computed fields for signups.
 * This combines the DB schema with dynamic runtime data.
 */
export interface EventWithSignupInfo extends Event {
    signup_count: number
    is_signed_up: boolean
}

/**
 * Response payload for a single event retrieval.
 *
 * @route GET /events/:id
 */
export default interface EventResponse {
    /** The detailed record of the requested event with signup info. */
    event: EventWithSignupInfo
}