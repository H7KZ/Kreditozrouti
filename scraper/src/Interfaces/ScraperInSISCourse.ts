import ScraperInSISFaculty from '@scraper/Interfaces/ScraperInSISFaculty'
import InSISSemester from '@scraper/Types/InSISSemester'
import InSISStudyPlanCourseCategory from '@scraper/Types/InSISStudyPlanCourseCategory'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup'

/**
 * Detailed data structure representing a single scraped InSIS course.
 * Maps closely to the syllabus page structure in the university system.
 */
export default interface ScraperInSISCourse {
    /** The unique numeric identifier of the course. */
    id: number

    /** The source URL from which the course data was scraped. */
    url: string

    /** The numeric ID extracted specifically from the URL parameters (used for redirect detection). */
    url_id: number | null

    /** The official course code (e.g., '4FIS101'). */
    ident: string | null

    /** The primary title of the course (usually in the language of instruction). */
    title: string | null

    /** The localized Czech title of the course, if available. */
    czech_title: string | null

    /** The number of ECTS credits awarded for completion. */
    ects: number | null

    /** The faculty offering the course. */
    faculty: ScraperInSISFaculty | null

    /** The format of instruction (e.g., 'Lecture', 'Seminar', 'Combined'). */
    mode_of_delivery: string | null

    /** The requirements for course completion (e.g., 'Exam', 'Credit'). */
    mode_of_completion: string | null

    /** List of languages in which the course is taught. */
    languages: string[] | null

    /** The academic level (e.g., 'Bachelor', 'Master', 'Doctoral'). */
    level: string | null

    /** The recommended year of study for enrollment. */
    year_of_study: number | null

    /** The recommended semester (e.g., 'Winter', 'Summer'). */
    semester: InSISSemester | null

    /** The academic year when the course is offered (e.g., "2023"). */
    year: number | null

    /** List of names of lecturers teaching the course. */
    lecturers: string[] | null

    /** Course codes or requirements needed before enrollment (Prerequisites). */
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

    /** List of study plans that include this course. */
    study_plans: ScraperInSISCourseStudyPlan[] | null
}

/**
 * Defines a specific criterion used to grade a course.
 */
export interface ScraperInSISCourseAssessmentMethod {
    /** The name of the assessment method (e.g., 'Final Exam', 'Homework'). */
    method: string | null

    /** The weight or point value assigned to this method. */
    weight: number | null
}

/**
 * Represents a distinct teaching group or instance (e.g., a specific seminar group).
 */
export interface ScraperInSISCourseTimetableUnit {
    /** The name of the lecturer assigned to this specific group. */
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
    /** The type of activity (e.g., 'Lecture', 'Seminar'). */
    type: string | null

    /** Indicates if the slot repeats weekly or occurs once. */
    frequency: 'weekly' | 'single' | null

    /** The specific date (used only if frequency is 'single'). */
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

/**
 * Represents the structure of a single scraped InSIS Study Plan.
 */
export interface ScraperInSISCourseStudyPlan {
    /** Plan code (e.g., "P-AIN"). */
    ident: string | null

    /** Faculty ident associated with this study plan. */
    facultyIdent: string | null

    /** The semester this plan applies to. */
    semester: InSISSemester | null

    /** Academic year (e.g., "2023"). */
    year: number | null

    /** Mode of study (e.g., Full-time, Combined). */
    mode_of_study: string | null

    /** Group type of the course in the study plan. */
    group: InSISStudyPlanCourseGroup

    /** Category of the course in the study plan. */
    category: InSISStudyPlanCourseCategory
}
