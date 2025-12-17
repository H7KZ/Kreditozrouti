import { Course } from '@api/Database/types'

interface FacetItem {
    value: string | null
    count: number
}

export default interface CoursesResponse {
    data: Course[]
    facets: {
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
    meta: {
        limit: number
        offset: number
        count: number
    }
}
