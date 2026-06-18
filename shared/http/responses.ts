import type {InSISDay, InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup} from '../domain/insis.js'
import type {FacetItem} from './facets.js'
import type {PaginationMeta} from './pagination.js'

// ---------------------------------------------------------------------------
// Entity DTOs — mirror the JSON wire format exactly
//
// Note: `created_at` and `updated_at` are typed as `string` because they
// represent ISO-8601 strings produced by JSON.stringify (which serialises
// JS Date objects to strings). The Kysely layer inside the API holds these
// as Date objects — the string type here reflects the over-the-wire format.
// ---------------------------------------------------------------------------

export interface FacultyDTO {
    id: string
    created_at: string
    updated_at: string
    title: string | null
    is_schedule_publicly_visible: boolean
}

export interface CourseAssessmentDTO {
    id: number
    course_id: number
    created_at: string
    updated_at: string
    method: string | null
    weight: number | null
}

export interface CourseUnitSlotDTO {
    id: number
    unit_id: number
    created_at: string
    updated_at: string
    type: string | null
    frequency: 'weekly' | 'single' | null
    date: string | null
    day: InSISDay | null
    time_from: number | null
    time_to: number | null
    location: string | null
}

export interface CourseUnitDTO {
    id: number
    course_id: number
    created_at: string
    updated_at: string
    lecturer: string | null
    capacity: number | null
    note: string | null
    slots: CourseUnitSlotDTO[]
}

export interface StudyPlanCourseDTO {
    id: number
    study_plan_id: number
    course_id: number | null
    course_ident: string
    created_at: string
    updated_at: string
    group: InSISStudyPlanCourseGroup
    category: InSISStudyPlanCourseCategory
}

export interface CourseDTO {
    id: number
    faculty_id: string | null
    created_at: string
    updated_at: string
    url: string
    ident: string
    title: string | null
    title_cs: string | null
    title_en: string | null
    ects: number | null
    mode_of_delivery: string | null
    mode_of_completion: string | null
    languages: string | null
    level: string | null
    year_of_study: number | null
    semester: InSISSemester | null
    year: number | null
    lecturers: string | null
    prerequisites: string | null
    recommended_programmes: string | null
    required_work_experience: string | null
    aims_of_the_course: string | null
    learning_outcomes: string | null
    course_contents: string | null
    special_requirements: string | null
    literature: string | null
    guarantors: string | null
    last_modified_date: string | null
    last_modified_by: string | null
    study_load: string | null
    literature_required: string | null
    literature_recommended: string | null
}

export interface CourseWithRelationsDTO extends CourseDTO {
    faculty: FacultyDTO | null
    units: CourseUnitDTO[]
    assessments: CourseAssessmentDTO[]
    study_plans: StudyPlanCourseDTO[]
}

export interface StudyPlanDTO {
    id: number
    faculty_id: string | null
    created_at: string
    updated_at: string
    url: string
    ident: string | null
    title: string | null
    semester: InSISSemester | null
    year: number | null
    level: string | null
    mode_of_study: string | null
    study_length: string | null
}

export interface StudyPlanWithRelationsDTO extends StudyPlanDTO {
    faculty: FacultyDTO | null
    courses: StudyPlanCourseDTO[]
}

// ---------------------------------------------------------------------------
// Response DTOs — wire format for each endpoint
//
// Facet shapes must stay in sync with the authoritative API response types:
//   api/src/Controllers/Kreditozrouti/types/CoursesResponse.ts
//   api/src/Controllers/Kreditozrouti/types/StudyPlansResponse.ts
//   api/src/Controllers/Kreditozrouti/types/StudyPlanCoursesResponse.ts
// When the API adds or renames a facet key, update the corresponding DTO here.
// ---------------------------------------------------------------------------

export interface CoursesResponseDTO {
    data: CourseWithRelationsDTO[]
    facets: {
        faculties: FacetItem[]
        days: FacetItem[]
        lecturers: FacetItem[]
        languages: FacetItem[]
        levels: FacetItem[]
        semesters: FacetItem[]
        years: FacetItem[]
        groups: FacetItem[]
        categories: FacetItem[]
        ects: FacetItem[]
        modes_of_completion: FacetItem[]
        assessment_methods: FacetItem[]
        time_range: { min_time: number; max_time: number }
    }
    meta: PaginationMeta
}

export interface StudyPlansResponseDTO {
    data: StudyPlanWithRelationsDTO[]
    facets: {
        faculties: FacetItem[]
        levels: FacetItem[]
        semesters: FacetItem[]
        years: FacetItem[]
        modes_of_studies: FacetItem[]
        study_lengths: FacetItem[]
    }
    meta: PaginationMeta
}

export interface StudyPlanCoursesResponseDTO {
    data: CourseDTO[]
    meta: {
        count: number
        total: number
    }
}
