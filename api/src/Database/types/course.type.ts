import { ColumnType, Selectable } from 'kysely'

export interface CourseTable {
    id: number

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    // assessment_methods: CourseAssessmentMethod[]
    // timetable: CourseTimetableUnit[]

    ident: string
    title: string | null
    czech_title: string | null
    ects: number | null
    mode_of_delivery: string | null
    mode_of_completion: string | null
    language: string | null
    level: string | null
    year_of_study: number | null
    semester: string | null
    lecturers: string | null
    prerequisites: string | null
    co_requisites: string | null
    recommended_programmes: string | null
    required_work_experience: string | null

    aims_of_the_course: string | null
    learning_outcomes: string | null
    course_contents: string | null

    special_requirements: string | null
    literature: string | null
}

export type Course = Selectable<CourseTable>

export interface CourseAssessmentMethodTable {
    id: number
    course_id: string

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    method: string | null
    weight: number | null
}

export type CourseAssessmentMethod = Selectable<CourseAssessmentMethodTable>

export interface CourseTimetableUnitTable {
    id: number
    course_id: string

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    // slots: CourseTimetableSlot[]

    lecturer: string | null
    capacity: number | null
    note: string | null
}

export type CourseTimetableUnit = Selectable<CourseTimetableUnitTable>

export interface CourseTimetableSlotTable {
    id: number
    timetable_unit_id: number

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    type: string | null
    frequency: 'weekly' | 'single' | null
    date: string | null
    day: string | null
    time_from: string | null
    time_to: string | null
    location: string | null
}

export type CourseTimetableSlot = Selectable<CourseTimetableSlotTable>
