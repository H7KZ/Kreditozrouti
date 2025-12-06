import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

export const CourseTableName = 'insis_courses'
export interface CourseTable {
    id: number

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    // assessment_methods: CourseAssessmentMethod[]
    // timetable: CourseTimetableUnit[]

    url: string
    ident: string
    title: string | null
    czech_title: string | null
    ects: number | null
    mode_of_delivery: string | null
    mode_of_completion: string | null
    languages: string | null
    level: string | null
    year_of_study: number | null
    semester: string | null
    lecturers: string | null
    prerequisites: string | null
    recommended_programmes: string | null
    required_work_experience: string | null

    aims_of_the_course: string | null
    learning_outcomes: string | null
    course_contents: string | null

    special_requirements: string | null
    literature: string | null
}

export type Course = Selectable<CourseTable>
export type NewCourse = Insertable<Omit<CourseTable, 'id' | 'created_at' | 'updated_at'>>

export const CourseAssessmentMethodTableName = 'insis_courses_assessment_methods'
export interface CourseAssessmentMethodTable {
    id: Generated<number>
    course_id: number

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    method: string | null
    weight: number | null
}

export type CourseAssessmentMethod = Selectable<CourseAssessmentMethodTable>
export type NewCourseAssessmentMethod = Insertable<Omit<CourseAssessmentMethodTable, 'id' | 'created_at' | 'updated_at'>>

export const CourseTimetableUnitTableName = 'insis_courses_timetable_units'
export interface CourseTimetableUnitTable {
    id: Generated<number>
    course_id: number

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    // slots: CourseTimetableSlot[]

    lecturer: string | null
    capacity: number | null
    note: string | null
}

export type CourseTimetableUnit = Selectable<CourseTimetableUnitTable>
export type NewCourseTimetableUnit = Insertable<Omit<CourseTimetableUnitTable, 'id' | 'created_at' | 'updated_at'>>

export const CourseTimetableSlotTableName = 'insis_courses_timetable_slots'
export interface CourseTimetableSlotTable {
    id: Generated<number>
    timetable_unit_id: number

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    type: string | null
    frequency: 'weekly' | 'single' | null
    date: string | null
    day: string | null
    time_from: string | null
    time_to: string | null
    time_from_minutes: number | null
    time_to_minutes: number | null
    location: string | null
}

export type CourseTimetableSlot = Selectable<CourseTimetableSlotTable>
export type NewCourseTimetableSlot = Insertable<Omit<CourseTimetableSlotTable, 'id' | 'created_at' | 'updated_at'>>
