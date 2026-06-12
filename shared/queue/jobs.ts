import type {InSISSemester, ScraperJob} from '../domain/insis.js'
import type {
    ScraperInSISAcademicSchedule,
    ScraperInSISAcademicSchedules,
    ScraperInSISCatalog,
    ScraperInSISCourse,
    ScraperInSISFacultyTimetable,
    ScraperInSISFacultyTimetables,
    ScraperInSISStudyPlan,
    ScraperInSISStudyPlans
} from './insis.js'

interface ScraperRequestJobBase {
    type: ScraperJob
    error?: { message: string }
}

export interface ScraperInSISCatalogRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Catalog'
    faculties?: string[]
    periods?: { semester: InSISSemester | null; year: number }[]
    auto_queue_courses?: boolean
    allowed_idents?: string[]
}

export interface ScraperInSISCourseRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:Course'
    url: string
    content_hash?: string | null
}

export interface ScraperInSISStudyPlansRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:StudyPlans'
    faculties?: string[]
    periods?: { semester: InSISSemester | null; year: number }[]
    auto_queue_study_plans?: boolean
}

export interface ScraperInSISStudyPlanRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:StudyPlan'
    url: string
}

export interface ScraperInSISAcademicSchedulesRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:AcademicSchedules'
}

export interface ScraperInSISAcademicScheduleRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:AcademicSchedule'
    insis_faculty_id: number
    insis_period_id: number
    faculty_ident: string
    semester: InSISSemester | null
    year: number
    level: string | null
    starts_at: string  // "YYYY-MM-DD"
    ends_at: string    // "YYYY-MM-DD"
}

export interface ScraperInSISFacultyTimetablesRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:FacultyTimetables'
}

export interface ScraperInSISFacultyTimetableRequestJob extends ScraperRequestJobBase {
    type: 'InSIS:FacultyTimetable'
    f_id: number
    name: string
}

export type ScraperRequestJob =
    | ScraperInSISCatalogRequestJob
    | ScraperInSISCourseRequestJob
    | ScraperInSISStudyPlansRequestJob
    | ScraperInSISStudyPlanRequestJob
    | ScraperInSISAcademicSchedulesRequestJob
    | ScraperInSISAcademicScheduleRequestJob
    | ScraperInSISFacultyTimetablesRequestJob
    | ScraperInSISFacultyTimetableRequestJob

interface ScraperResponseJobBase {
    type: ScraperJob
    error?: { message: string }
}

export interface ScraperInSISCatalogResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:Catalog'
    catalog: ScraperInSISCatalog
}

export interface ScraperInSISCourseResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:Course'
    course: ScraperInSISCourse | null
}

export interface ScraperInSISStudyPlansResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:StudyPlans'
    plans: ScraperInSISStudyPlans
}

export interface ScraperInSISStudyPlanResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:StudyPlan'
    plan: ScraperInSISStudyPlan | null
}

export interface ScraperInSISAcademicSchedulesResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:AcademicSchedules'
    schedules: ScraperInSISAcademicSchedules
}

export interface ScraperInSISAcademicScheduleResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:AcademicSchedule'
    schedule: ScraperInSISAcademicSchedule
}

export interface ScraperInSISFacultyTimetablesResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:FacultyTimetables'
    data: ScraperInSISFacultyTimetables
}

export interface ScraperInSISFacultyTimetableResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:FacultyTimetable'
    timetable: ScraperInSISFacultyTimetable
}

export interface ScraperInSISGapSweepResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:GapSweep'
}

export type ScraperResponseJob =
    | ScraperInSISCatalogResponseJob
    | ScraperInSISCourseResponseJob
    | ScraperInSISStudyPlansResponseJob
    | ScraperInSISStudyPlanResponseJob
    | ScraperInSISAcademicSchedulesResponseJob
    | ScraperInSISAcademicScheduleResponseJob
    | ScraperInSISFacultyTimetablesResponseJob
    | ScraperInSISFacultyTimetableResponseJob
    | ScraperInSISGapSweepResponseJob
