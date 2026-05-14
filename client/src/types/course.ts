import type { CourseUnitType, InSISDay } from '@shared/domain/insis'
import type { TimeSelection } from '@shared/domain/time'
import type { CoursesFilter } from '@shared/http/courses'
import type { PaginationMeta } from '@shared/http/pagination'
import type { CoursesResponse, CourseUnit, CourseUnitSlot, CourseWithRelations } from '../../../api/src/Contracts'

export interface CoursesState {
	filters: CoursesFilter
	courses: CourseWithRelations[]
	facets: CoursesResponse['facets']
	pagination: PaginationMeta
	loading: boolean
	error: string | null
	expandedCourseIds: Set<number>
	hideConflictingCourses: boolean
	timetableExcludeTimes: TimeSelection[]
}

export type CourseUnitWithSlots = CourseUnit<void, CourseUnitSlot>


export interface SelectedCourseUnit {
	courseId: number
	courseIdent: string
	courseTitle: string
	courseTitleCs: string
	courseTitleEn: string
	unitId: number
	unitType: CourseUnitType
	slotId: number
	day?: InSISDay
	date?: string
	timeFrom: number
	timeTo: number
	location?: string
	lecturer?: string
	ects?: number
	snapshotAvailableTypes?: CourseUnitType[]
}

export interface UnitGroup {
	types: CourseUnitType[]
	units: CourseUnitWithSlots[]
}

export type UnitGroupMap = Map<string, UnitGroup>

export interface CourseStatus {
	id: number
	ident: string
	title: string
	titleCs: string
	titleEn: string
	status: 'selected' | 'conflict' | 'campus-conflict' | 'incomplete'
	conflictsWith: string[]
	campusConflictsWith: string[]
	missingTypes: CourseUnitType[]
}

export type CourseStatusType = 'selected' | 'conflict' | 'campus-conflict' | 'incomplete'

export interface CourseStatusFilterState {
	selectedStatuses: CourseStatusType[]
	selectedCourseIdents: string[]
}

export type ConflictType = 'hard' | 'campus'

export interface SlotConflictInfo {
	slotId: number
	conflictingUnits: SelectedCourseUnit[]
	conflictType?: ConflictType
}
