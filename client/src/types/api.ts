import type { CoursesFilter, PaginationMeta, StudyPlansFilter } from '@kreditozrouti/types'

export type { PaginationMeta }

export type SortDirection = CoursesFilter['sort_dir'] | StudyPlansFilter['sort_dir']

export type CourseSortBy = NonNullable<CoursesFilter['sort_by']>

export type StudyPlanSortBy = StudyPlansFilter['sort_by']
