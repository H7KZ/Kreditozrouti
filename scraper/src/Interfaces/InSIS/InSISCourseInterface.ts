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
    prerequisites: string[]
    'co-requisites': string[]
    recommendedProgrammes: string[]
    requiredWorkExperience: string

    aimsOfTheCourse: string
    learningOutcomes: string
    courseContents: string
    teachingMethods: void // TO DO type
    assessmentMethods: void // TO DO type

    specialRequirements: string
    literature: string

    timetable: void // TO DO type
}
