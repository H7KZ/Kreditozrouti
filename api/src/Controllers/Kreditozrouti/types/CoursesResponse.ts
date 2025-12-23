import { Course, StudyPlan } from '@api/Database/types'

interface FacetItem {
    value: string | null
    count: number
}

export default interface CoursesResponse {
    data: {
        courses: Course[]
        study_plans: StudyPlan[]
    }
    facets: {
        courses: {
            faculties: FacetItem[]
            departments: FacetItem[]
            days: FacetItem[]
            lecturers: FacetItem[]
            languages: FacetItem[]
            levels: FacetItem[]
            semesters: FacetItem[]
            time_range: {
                min_time: number
                max_time: number
            }
        }
        study_plans: {
            faculties: FacetItem[]
            levels: FacetItem[]
            semesters: FacetItem[]
            modes: FacetItem[]
            lengths: FacetItem[]
        }
    }
    meta: {
        limit: number
        offset: number
        count: number
    }
}
