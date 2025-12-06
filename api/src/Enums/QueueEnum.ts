/**
 * Identifies the message queues used for asynchronous communication between services.
 */
enum QueueEnum {
    /** Queue for dispatching outgoing scraping tasks. */
    SCRAPER_REQUEST = 'ScraperRequestQueue',
    /** Queue for receiving incoming scraping results. */
    SCRAPER_RESPONSE = 'ScraperResponseQueue'
}

export { QueueEnum }
