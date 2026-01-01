/**
 * Filter criteria for querying Courses.
 */
export default interface CoursesFilter {
    /** Semester string (e.g., "ZS 2025/2026"). */
    semester?: string | string[]

    /** Course identifier code (e.g., "4IT"). */
    ident?: string | string[]

    lecturer?: string | string[]

    /** Day of the week (e.g., "Mon", "Tue"). */
    day?: string | string[]

    /** Language code (e.g., "EN", "CZ"). */
    language?: string | string[]

    /** Academic level (e.g., "Bachelor", "Master"). */
    level?: string | string[]

    /** Faculty derived from the first digit of ident (e.g., "4"). */
    faculty?: string | string[]

    /** Start time in minutes from midnight. */
    time_from?: number

    /** End time in minutes from midnight. */
    time_to?: number

    /** Filter courses associated with a specific Study Plan ID. */
    study_plan_id?: number
}
