/**
 * Defines the detailed data structure for a single scraped InSIS course.
 */
export default interface ScraperInSISCourse {
    /** The unique numeric identifier of the course. */
    id: number
    /** The source URL from which the course data was scraped. */
    url: string
    /** The official course code (e.g., '4FIS101'). */
    ident: string | null
    /** The primary title of the course (usually in the language of instruction). */
    title: string | null
    /** The localized Czech title of the course. */
    czech_title: string | null
    /** The number of ECTS credits awarded for completion. */
    ects: number | null
    /** The format of instruction (e.g., Lecture, Seminar). */
    mode_of_delivery: string | null
    /** The requirements for course completion (e.g., Exam, Credit). */
    mode_of_completion: string | null
    /** List of languages in which the course is taught. */
    languages: string[] | null
    /** The academic level (e.g., Bachelor, Master). */
    level: string | null
    /** The recommended year of study for enrollment. */
    year_of_study: number | null
    /** The recommended semester (e.g., Winter, Summer). */
    semester: string | null
    /** List of names of lecturers teaching the course. */
    lecturers: string[] | null
    /** Course codes or requirements needed before enrollment. */
    prerequisites: string | null
    /** Study programmes for which this course is recommended. */
    recommended_programmes: string | null
    /** Professional experience required for enrollment. */
    required_work_experience: string | null

    /** Description of the course's educational goals. */
    aims_of_the_course: string | null
    /** Skills and knowledge acquired upon completion. */
    learning_outcomes: string | null
    /** Detailed syllabus and topic breakdown. */
    course_contents: string | null
    /** List of criteria used for grading. */
    assessment_methods: ScraperInSISCourseAssessmentMethod[] | null

    /** Specific conditions or hardware/software requirements. */
    special_requirements: string | null
    /** List of recommended reading materials. */
    literature: string | null

    /** List of scheduled teaching units/groups. */
    timetable: ScraperInSISCourseTimetableUnit[] | null
}

/**
 * Defines a specific criterion used to grade a course.
 */
export interface ScraperInSISCourseAssessmentMethod {
    /** The name of the assessment method (e.g., 'Final Exam'). */
    method: string | null
    /** The weight or point value assigned to this method. */
    weight: number | null
}

/**
 * Represents a distinct teaching group or instance (e.g., a specific seminar group).
 */
export interface ScraperInSISCourseTimetableUnit {
    /** The name of the lecturer assigned to this group. */
    lecturer: string | null
    /** The maximum student capacity for this group. */
    capacity: number | null
    /** Additional notes regarding this specific group. */
    note: string | null

    /** List of specific time blocks associated with this group. */
    slots: ScraperInSISCourseTimetableSlot[] | null
}

/**
 * Represents a specific scheduled time block (slot) within a timetable unit.
 */
export interface ScraperInSISCourseTimetableSlot {
    /** The type of activity (e.g., Lecture, Seminar). */
    type: string | null
    /** Indicates if the slot repeats weekly or occurs once. */
    frequency: 'weekly' | 'single' | null
    /** The specific date (used if frequency is 'single'). */
    date: string | null
    /** The day of the week (used if frequency is 'weekly'). */
    day: string | null
    /** The start time of the slot (HH:MM). */
    time_from: string | null
    /** The end time of the slot (HH:MM). */
    time_to: string | null
    /** The physical room or location code. */
    location: string | null
}
