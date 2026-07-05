import type { CoursesFilter } from '@kreditozrouti/core/http/courses'
import type { StudyPlansFilter } from '@kreditozrouti/core/http/study-plans'

export type { PaginationMeta } from '@kreditozrouti/core/http/pagination'

export type SortDirection = CoursesFilter['sort_dir'] | StudyPlansFilter['sort_dir']

export type CourseSortBy = NonNullable<CoursesFilter['sort_by']>

export type StudyPlanSortBy = StudyPlansFilter['sort_by']
