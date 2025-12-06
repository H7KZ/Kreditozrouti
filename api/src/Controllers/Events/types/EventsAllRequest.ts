/**
 * Defines the query parameters for filtering and searching events.
 * @route 200 /events/all
 */
export default interface EventsAllRequest {
    /** An optional keyword to filter events by title. */
    title?: string | null

    /** The start of the date range for filtering. */
    date_from?: Date | null

    /** The end of the date range for filtering. */
    date_to?: Date | null

    /** A list of category IDs to filter events by association. */
    categories?: string[] | null
}
