import { Event } from '@api/Database/types'

/**
 * Interface representing a response for fetching a specific event
 *
 * @route 200 /event/:id
 */
export default interface EventResponse {
    /**
     * Event object
     *
     * @type {Event}
     */
    event: Event
}
