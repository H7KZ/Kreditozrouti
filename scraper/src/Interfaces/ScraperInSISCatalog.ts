/**
 * Represents the raw output of a course catalog scrape.
 */
export default interface ScraperInSISCatalog {
    /** A list of absolute URLs pointing to individual course syllabus pages found in the catalog. */
    urls: string[]
}
