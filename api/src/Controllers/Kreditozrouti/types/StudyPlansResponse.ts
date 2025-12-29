import { StudyPlan } from '@api/Database/types'

interface FacetItem {
    value: string | null
    count: number
}

export default interface StudyPlansResponse {
    data: StudyPlan[]
    facets: {
        faculties: FacetItem[]
        levels: FacetItem[]
        semesters: FacetItem[]
        modes_of_studies: FacetItem[]
        study_lengths: FacetItem[]
    }
    meta: {
        limit: number
        offset: number
        count: number
    }
}
