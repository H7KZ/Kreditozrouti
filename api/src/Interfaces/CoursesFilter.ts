export default interface CoursesFilter {
    semester?: string | string[] // e.g., "ZS 2025/2026"
    ident?: string | string[] // Search by course code (e.g., "4IT")
    lecturer?: string | string[] // Search by lecturer name
    day?: string | string[] // e.g., "Mon", "Tue"
    language?: string | string[] // e.g., "EN", "CZ"
    level?: string | string[] // e.g., "Bachelor", "Master"
    faculty?: string | string[] // Derived first digit of ident (e.g., "4")

    time_from?: number // Start time in minutes from midnight
    time_to?: number // End time in minutes from midnight

    study_plan_id?: number // Filter courses by specific Study Plan ID
}
