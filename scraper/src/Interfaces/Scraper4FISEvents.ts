/**
 * Represents the raw output of an event list scrape.
 */
export default interface Scraper4FISEvents {
    /** An array of unique event IDs extracted from an events listing page. */
    ids: string[]
}
