/**
 * Defines the criteria for filtering course data in the InSIS system.
 * Most string fields support polymorphism, accepting either a single string
 * or an array of strings to allow for multi-selection (OR logic).
 */
export default interface CoursesFilter {
    /**
     * The academic term(s) to filter by.
     * @example "ZS 2025/2026"
     */
    semester?: string | string[]

    /**
     * Search by course identifier (code).
     * Usually supports partial matching.
     * @example "4IT" or "4IT101"
     */
    ident?: string | string[]

    /**
     * Search by instructor name.
     * Matches against both the course supervisor and the specific timetable slot teacher.
     */
    lecturer?: string | string[]

    /**
     * Filter by scheduled day(s) of the week.
     * @example "Mon", "Tue"
     */
    day?: string | string[]

    /**
     * The lower bound of the time range, expressed in minutes from midnight.
     * @example 480 (for 08:00 AM)
     */
    time_from?: number

    /**
     * The upper bound of the time range, expressed in minutes from midnight.
     * @example 1200 (for 08:00 PM)
     */
    time_to?: number

    /**
     * Filter by the language of instruction.
     * @example "EN", "CZ"
     */
    language?: string | string[]

    /**
     * Filter by academic study level.
     * @example "Bachelor", "Master", "Doctoral"
     */
    level?: string | string[]

    /**
     * Filter by the faculty code.
     * typically derived from the first digit of the course `ident`.
     * @example "4" (Faculty of Informatics and Statistics)
     */
    faculty?: string | string[]
}
