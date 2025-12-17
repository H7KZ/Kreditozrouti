/**
 * Defines the data structure for a single scraped 4FIS event.
 */
export default interface Scraper4FISEvent {
    /** Unique identifier derived from the event URL path. */
    id: string | null
    /** The main headline of the event. */
    title: string | null
    /** Secondary title or tagline. */
    subtitle: string | null
    /** List of category names or IDs associated with the event. */
    categories: string[] | null
    /** ISO 8601 formatted string representing the event start date and time. */
    datetime: string | null
    /** Metadata for the event's featured image. */
    image: {
        /** The source URL of the image. */
        src: string | null
        /** The alternative text description of the image. */
        alt: string | null
    }
    /** Full event description formatted in Markdown. */
    description: string | null
    /** The physical location or venue of the event. */
    place: string | null
    /** Name of the event organizer or content author. */
    author: string | null
    /** The language code of the event (e.g., 'cs', 'en'). */
    language: string | null
    /** ISO 8601 formatted string indicating when registration opens. */
    registration_from: string | null
    /** External URL for primary participant registration. */
    registration_url: string | null
    /** External URL for waitlist or substitute registration. */
    substitute_url: string | null
}
