export default interface InSISCourseInterface {
    ident: string
    title: string
    czechTitle: string
    ects: number
    modeOfDelivery: string
    modeOfCompletion: string
    language: string
    level: string
    yearOfStudy: number
    semester: string
    lecturers: string[]
    prerequisites: string
    'co-requisites': string
    recommendedProgrammes: string
    requiredWorkExperience: string

    aimsOfTheCourse: string
    learningOutcomes: string
    courseContents: string
    assessmentMethods: AssessmentMethod[]

    specialRequirements: string
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
    timeFrom: string
    timeTo: string
    location: string
}
