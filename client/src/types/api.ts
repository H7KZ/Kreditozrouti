import { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import { StudyPlansFilter } from '@api/Validations/StudyPlansFilterValidation.ts'

/** Pagination metadata (matches API response meta) */
export interface PaginationMeta {
	limit: number
	offset: number
	count: number
	total: number
}

/** Sort direction */
export type SortDirection = CoursesFilter['sort_dir'] | StudyPlansFilter['sort_dir']

/** Course sort options (matches CoursesFilterValidation) */
export type CourseSortBy = CoursesFilter['sort_by']

/** Study plan sort options (matches StudyPlansFilterValidation) */
export type StudyPlanSortBy = StudyPlansFilter['sort_by']
