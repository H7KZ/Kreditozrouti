/**
 * Events All Request Interface
 *
 * @route 200 /events/all
 */
export default interface EventsAllRequest {
    /**
     * Event Title
     *
     * @type {string | null}
     */
    title?: string | null

    /**
     * Date From
     *
     * @type {Date | null}
     */
    date_from?: Date | null

    /**
     * Date To
     *
     * @type {Date | null}
     */
    date_to?: Date | null

    /**
     * Categories (Array of Category IDs)
     *
     * @type {string[] | null}
     */
    categories?: string[] | null
}
