import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse.ts'
import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import { PaginationMeta } from '@client/types/api.ts'

export interface CoursesState {
	filters: CoursesFilter
	courses: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>[]
	facets: CoursesResponse['facets']
	pagination: PaginationMeta
	loading: boolean
	error: string | null
	expandedCourseIds: Set<number>
}
