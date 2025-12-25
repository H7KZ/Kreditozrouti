import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

/**
 * Defines the schema structure for the Course table.
 */
export class CourseTable {
    /** Database table name for courses. */
    static readonly _table = 'insis_courses' as const

    /** Primary key. */
    id!: number

    /** Record creation timestamp. */
    created_at!: ColumnType<Date, string | undefined, never>
    /** Record last update timestamp. */
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    // assessment_methods!: CourseAssessmentMethod[]
    // timetable!: CourseTimetableUnit[]

    /** External URL for the course details. */
    url!: string
    /** Unique course identifier code. */
    ident!: string
    /** Official course title. */
    title!: string | null
    /** Localized Czech title. */
    czech_title!: string | null
    /** ECTS credit value. */
    ects!: number | null
    /** Faculty name. */
    faculty!: string | null
    /** Format of course delivery (e.g., in-person, remote). */
    mode_of_delivery!: string | null
    /** Requirements for completion. */
    mode_of_completion!: string | null
    /** Languages of instruction (comma-separated if multiple). */
    languages!: string | null
    /** Academic level (e.g., Bachelor, Master). */
    level!: string | null
    /** Recommended year of study. */
    year_of_study!: number | null
    /** Semester (e.g., Winter, Summer). */
    semester!: string | null
    /** Names of lecturers associated with the course. */
    lecturers!: string | null
    /** Prerequisite courses or knowledge. */
    prerequisites!: string | null
    /** Recommended study programmes. */
    recommended_programmes!: string | null
    /** Required professional experience. */
    required_work_experience!: string | null

    /** Educational goals of the course. */
    aims_of_the_course!: string | null
    /** Knowledge acquired upon completion. */
    learning_outcomes!: string | null
    /** Detailed syllabus or content breakdown. */
    course_contents!: string | null

    /** Special requirements for enrollment or completion. */
    special_requirements!: string | null
    /** Recommended reading and literature. */
    literature!: string | null
}

/** Type representing a selected course record. */
export type Course = Selectable<CourseTable>
/** Type representing data required to insert a new course. */
export type NewCourse = Insertable<Omit<CourseTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Defines the schema structure for the Course ID Redirect table.
 */
export class CourseIdRedirectTable {
    /** Database table name for course ID redirects. */
    static readonly _table = 'insis_courses_id_redirects' as const

    /** Foreign key referencing the Course table. */
    course_id!: number

    /** Old or alternative course identifier. */
    old_id!: number
}

/** Type representing a selected course ID redirect record. */
export type CourseIdRedirect = Selectable<CourseIdRedirectTable>
/** Type representing data required to insert a new course ID redirect. */
export type NewCourseIdRedirect = Insertable<Omit<CourseIdRedirectTable, 'id'>>

// -------------------------------------------------------------------------

/**
 * Defines the schema structure for the Assessment Method table.
 */
export class CourseAssessmentMethodTable {
    /** Database table name for course assessment methods. */
    static readonly _table = 'insis_courses_assessment_methods' as const

    /** Auto-generated primary key. */
    id!: Generated<number>
    /** Foreign key referencing the Course table. */
    course_id!: number

    /** Record creation timestamp. */
    created_at!: ColumnType<Date, string | undefined, never>
    /** Record last update timestamp. */
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    /** Description of the assessment method (e.g., Exam, Homework). */
    method!: string | null
    /** Weight of the assessment in the final grade. */
    weight!: number | null
}

/** Type representing a selected assessment method record. */
export type CourseAssessmentMethod = Selectable<CourseAssessmentMethodTable>
/** Type representing data required to insert a new assessment method. */
export type NewCourseAssessmentMethod = Insertable<Omit<CourseAssessmentMethodTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Defines the schema structure for the Timetable Unit table.
 * Represents a teaching group or specific instance of a course.
 */
export class CourseTimetableUnitTable {
    /** Database table name for course timetable units. */
    static readonly _table = 'insis_courses_timetable_units' as const

    /** Auto-generated primary key. */
    id!: Generated<number>
    /** Foreign key referencing the Course table. */
    course_id!: number

    /** Record creation timestamp. */
    created_at!: ColumnType<Date, string | undefined, never>
    /** Record last update timestamp. */
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    // slots!: CourseTimetableSlot[]

    /** Name of the lecturer for this unit. */
    lecturer!: string | null
    /** Maximum student capacity. */
    capacity!: number | null
    /** Additional notes regarding the unit. */
    note!: string | null
}

/** Type representing a selected timetable unit record. */
export type CourseTimetableUnit = Selectable<CourseTimetableUnitTable>
/** Type representing data required to insert a new timetable unit. */
export type NewCourseTimetableUnit = Insertable<Omit<CourseTimetableUnitTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Defines the schema structure for the Timetable Slot table.
 * Represents specific scheduled times and locations for a unit.
 */
export class CourseTimetableSlotTable {
    /** Database table name for course timetable slots. */
    static readonly _table = 'insis_courses_timetable_slots' as const

    /** Auto-generated primary key. */
    id!: Generated<number>
    /** Foreign key referencing the Timetable Unit table. */
    timetable_unit_id!: number

    /** Record creation timestamp. */
    created_at!: ColumnType<Date, string | undefined, never>
    /** Record last update timestamp. */
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    /** Type of action (e.g., Lecture, Seminar). */
    type!: string | null
    /** Recurrence frequency. */
    frequency!: 'weekly' | 'single' | null
    /** Specific date (if single occurrence). */
    date!: string | null
    /** Day of the week (if weekly). */
    day!: string | null
    /** Start time string. */
    time_from!: string | null
    /** End time string. */
    time_to!: string | null
    /** Start time in minutes from midnight. */
    time_from_minutes!: number | null
    /** End time in minutes from midnight. */
    time_to_minutes!: number | null
    /** Physical room or location. */
    location!: string | null
}

/** Type representing a selected timetable slot record. */
export type CourseTimetableSlot = Selectable<CourseTimetableSlotTable>
/** Type representing data required to insert a new timetable slot. */
export type NewCourseTimetableSlot = Insertable<Omit<CourseTimetableSlotTable, 'id' | 'created_at' | 'updated_at'>>
