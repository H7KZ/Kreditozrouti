import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

/**
 * Defines the schema structure for the Study Plan table.
 * Represents a specific curriculum (e.g., a specific program in a specific semester and mode).
 */
export class StudyPlanTable {
    /** Database table name for study plans. */
    static readonly _table = 'insis_study_plans' as const

    /** Primary key. */
    id!: number

    /** Record creation timestamp. */
    created_at!: ColumnType<Date, string | undefined, never>
    /** Record last update timestamp. */
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    /** Full source URL. */
    url!: string
    /** Plan identifier code (e.g., "P-AIN"). */
    ident!: string | null
    /** Full title of the program/specialization. */
    title!: string | null
    /** Faculty name. */
    faculty!: string | null
    /** Semester string (e.g., "ZS 2025/2026"). */
    semester!: string | null
    /** Academic level (e.g., "Doktorský"). */
    level!: string | null
    /** Mode of study (e.g., "Prezenční", "Kombinovaná"). */
    mode_of_study!: string | null
    /** Standard length of study. */
    study_length!: string | null
}

/** Type representing a selected study plan record. */
export type StudyPlan = Selectable<StudyPlanTable>
/** Type representing data required to insert a new study plan. */
export type NewStudyPlan = Insertable<Omit<StudyPlanTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Defines the schema structure for linking Courses to Study Plans.
 * Stores the course identifier and its specific category within the plan.
 */
export class StudyPlanCourseTable {
    /** Database table name for study plan course entries. */
    static readonly _table = 'insis_study_plans_courses' as const

    /** Auto-generated primary key. */
    id!: Generated<number>

    /** Foreign key referencing the Study Plan table. */
    study_plan_id!: number

    /** * Foreign key referencing the Course table.
     * This connects the plan directly to the existing scraped course data.
     * Note: This might be nullable if the course hasn't been scraped yet but exists in the plan.
     */
    course_id!: number | null

    /** Record creation timestamp. */
    created_at!: ColumnType<Date, string | undefined, never>
    /** Record last update timestamp. */
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    /** The course identifier string (e.g., "4IT101"). Useful for lookups if course_id is null. */
    course_ident!: string

    /** * The category of the course within this specific plan.
     * Maps to the specific arrays from the scraper.
     */
    category!: 'compulsory' | 'elective' | 'physical_education' | 'general_elective' | 'state_exam' | 'language' | 'optional'
}

/** Type representing a selected study plan course entry. */
export type StudyPlanCourse = Selectable<StudyPlanCourseTable>
/** Type representing data required to insert a new study plan course entry. */
export type NewStudyPlanCourse = Insertable<Omit<StudyPlanCourseTable, 'id' | 'created_at' | 'updated_at'>>
