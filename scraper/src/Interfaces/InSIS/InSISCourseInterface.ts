export default interface InSISCourseInterface {
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
    lecturers: string[] | null
    prerequisites: string | null
    co_requisites: string | null
    recommended_programmes: string | null
    required_work_experience: string | null

    aims_of_the_course: string | null
    learning_outcomes: string | null
    course_contents: string | null
    assessment_methods: AssessmentMethod[] | null

    special_requirements: string | null
    literature: string | null

    timetable: TimetableUnit[] | null
}

interface AssessmentMethod {
    method: string | null
    weight: number | null
}

interface TimetableUnit {
    lecturer: string | null
    capacity: number | null
    note: string | null

    slots: TimetableSlot[] | null
}

interface TimetableSlot {
    type: string | null
    frequency: 'weekly' | 'single' | null
    date: string | null
    day: string | null
    time_from: string | null
    time_to: string | null
    location: string | null
}
