export default interface InSISCourseInterface {
    ident: string
    title: string
    czech_title: string
    ects: number
    mode_of_delivery: string
    mode_of_completion: string
    language: string
    level: string
    year_of_study: number
    semester: string
    lecturers: string[]
    prerequisites: string
    co_requisites: string
    recommended_programmes: string
    required_work_experience: string

    aims_of_the_course: string
    learning_outcomes: string
    course_contents: string
    assessment_methods: AssessmentMethod[]

    special_requirements: string
    literature: string

    timetable: TimetableUnit[]
}

interface AssessmentMethod {
    method: string
    weight: number
}

interface TimetableUnit {
    lecturer: string
    capacity: number
    note: string

    slots: TimetableSlot[]
}

interface TimetableSlot {
    type: string
    frequency: 'weekly' | 'single'
    date: string | null
    day: string | null
    time_from: string
    time_to: string
    location: string
}
