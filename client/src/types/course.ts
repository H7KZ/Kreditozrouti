import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse.ts'
import { CourseUnit, CourseUnitSlot, CourseWithRelations } from '@api/Database/types'
import { TimeSelection } from '@api/Validations'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import { PaginationMeta } from '@client/types'
import type InSISDay from '@scraper/Types/InSISDay'

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

/**
 * Course unit with slots loaded.
 */
export type CourseUnitWithSlots = CourseUnit<void, CourseUnitSlot>

/**
 * Unit types supported by the timetable.
 */
export type CourseUnitType = 'lecture' | 'exercise' | 'seminar'

/**
 * A selected course unit in the timetable.
 */
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
}

/**
 * Group of units organized by their type composition.
 * Key is the types joined by '|' (e.g., "lecture|exercise")
 */
export interface UnitGroup {
	types: CourseUnitType[]
	units: CourseUnitWithSlots[]
}

/**
 * Map of unit groups keyed by type composition string.
 */
export type UnitGroupMap = Map<string, UnitGroup>

/**
 * Course status information for UI indicators
 */
export interface CourseStatus {
	id: number
	ident: string
	title: string
	titleCs: string
	titleEn: string
	status: 'selected' | 'conflict' | 'incomplete'
	conflictsWith: string[]
	missingTypes: CourseUnitType[]
}

/**
 * Course status type for filtering
 */
export type CourseStatusType = 'selected' | 'conflict' | 'incomplete'

/**
 * Filter state for course status filtering
 */
export interface CourseStatusFilterState {
	selectedStatuses: CourseStatusType[]
	selectedCourseIdents: string[]
}

/**
 * Conflict info for a specific slot in the expanded course view.
 */
export interface SlotConflictInfo {
	slotId: number
	conflictingUnits: SelectedCourseUnit[]
}
