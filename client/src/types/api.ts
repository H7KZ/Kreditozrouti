import type { CoursesFilter } from '@shared/http/courses'
import type { StudyPlansFilter } from '@shared/http/study-plans'

export type { PaginationMeta } from '@shared/http/pagination'

export type SortDirection = CoursesFilter['sort_dir'] | StudyPlansFilter['sort_dir']

export type CourseSortBy = CoursesFilter['sort_by']

export type StudyPlanSortBy = StudyPlansFilter['sort_by']
