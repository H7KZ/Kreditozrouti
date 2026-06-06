import type {InSISSemester, ScraperJob} from '../domain/insis.js'
import type {ScraperInSISCatalog, ScraperInSISCourse, ScraperInSISStudyPlan, ScraperInSISStudyPlans} from './insis.js'

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

export type ScraperRequestJob =
    | ScraperInSISCatalogRequestJob
    | ScraperInSISCourseRequestJob
    | ScraperInSISStudyPlansRequestJob
    | ScraperInSISStudyPlanRequestJob

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
    content_hash: string
}

export interface ScraperInSISStudyPlansResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:StudyPlans'
    plans: ScraperInSISStudyPlans
}

export interface ScraperInSISStudyPlanResponseJob extends ScraperResponseJobBase {
    type: 'InSIS:StudyPlan'
    plan: ScraperInSISStudyPlan | null
}

export type ScraperResponseJob =
    | ScraperInSISCatalogResponseJob
    | ScraperInSISCourseResponseJob
    | ScraperInSISStudyPlansResponseJob
    | ScraperInSISStudyPlanResponseJob
