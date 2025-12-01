import { ColumnType, Selectable } from 'kysely'

export interface CourseTable {
    id: string

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    ident: string | null
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
    assessment_methods: string | null

    special_requirements: string | null
    literature: string | null

    timetable: string | null
}

export type Course = Selectable<CourseTable>