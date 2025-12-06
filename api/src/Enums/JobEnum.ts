/**
 * Defines unique identifiers for background processing jobs.
 * Distinguishes between request triggers and response processors.
 */
enum JobEnum {
    /** Job to request a crawl of the events list. */
    FIS_EVENTS_REQUEST = 'EventsRequestJob',
    /** Job to process the result of an events list crawl. */
    FIS_EVENTS_RESPONSE = 'EventsResponseJob',
    /** Job to request a crawl of a specific event detail. */
    FIS_EVENT_REQUEST = 'EventRequestJob',
    /** Job to process the result of a specific event detail crawl. */
    FIS_EVENT_RESPONSE = 'EventResponseJob',

    /** Job to request a crawl of the course catalog. */
    INSIS_CATALOG_REQUEST = 'InSISCatalogRequestJob',
    /** Job to process the result of a course catalog crawl. */
    INSIS_CATALOG_RESPONSE = 'InSISCatalogResponseJob',
    /** Job to request a crawl of specific course details. */
    INSIS_COURSE_REQUEST = 'InSISCourseRequestJob',
    /** Job to process the result of a course detail crawl. */
    INSIS_COURSE_RESPONSE = 'InSISCourseResponseJob'
}

export { JobEnum }
