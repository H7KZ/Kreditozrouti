/**
 * Represents the structure of a single scraped InSIS Study Plan.
 */
export default interface ScraperInSISStudyPlan {
    /** Unique numeric identifier for the study plan. */
    id: number

    /** Full URL source of the study plan. */
    url: string

    /** Plan code (e.g., "P-AIN"). */
    ident: string | null

    /** Title of the plan or specialization. */
    title: string | null

    /** Faculty name. */
    faculty: string | null

    /** The semester this plan applies to. */
    semester: string | null

    /** Academic level (e.g., Bachelor). */
    level: string | null

    /** Mode of study (e.g., Full-time, Combined). */
    mode_of_study: string | null

    /** Standard length of study in years or semesters. */
    study_length: string | null

    /** List of courses associated with this study plan, categorized by type. */
    courses: ScraperInSISStudyPlanCourseCategory[] | null
}

/**
 * Represents a course entry within a study plan, including its categorization.
 */
export interface ScraperInSISStudyPlanCourseCategory {
    /** The ID of the course.
     * Note: May be null if the course exists in the plan text but is not a clickable link in InSIS.
     */
    id: number | null

    /** URL to the course detail page. */
    url: string | null

    /** The course code (e.g., "4IT101"). */
    ident: string

    /**
     * The classification of the course within this specific study plan.
     * - `compulsory`: Povinné oborové, hlavní, vedlejší, fakultní, specializační (oP, hP, sP, fP, eP).
     * - `elective`: Volitelné v rámci specializace/oboru (oV, hV, sV, fV, eV).
     * - `physical_education`: Tělesná výchova (cTVS1, cTVS2).
     * - `general_elective`: Celoškolsky volně volitelné / Free credits (cVM, cVD, cVP).
     * - `state_exam`: Státní zkoušky a obhajoby (oSZ, hSZ, sSZ, fSZ).
     * - `language`: Jazykové moduly (oJ, fJ, sK).
     * - `optional`: Fallback for unclassified courses.
     */
    category: 'compulsory' | 'elective' | 'physical_education' | 'general_elective' | 'state_exam' | 'language' | 'optional'
}
