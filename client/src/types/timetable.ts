import InSISDay from '@scraper/Types/InSISDay.ts'

/** Course unit types for timetable display */
export type CourseUnitType = 'lecture' | 'exercise' | 'seminar' | 'combined'

/** Selected course unit for timetable */
export interface SelectedCourseUnit {
	courseId: number
	courseIdent: string
	courseTitle: string
	unitId: number
	unitType: CourseUnitType
	slotId: number
	day: InSISDay
	timeFrom: number // Minutes from midnight
	timeTo: number // Minutes from midnight
	room?: string
	lecturer?: string
	ects?: number
}

/** Drag selection state for timetable */
export interface DragSelection {
	active: boolean
	startDay: InSISDay | null
	startTime: number | null
	endDay: InSISDay | null
	endTime: number | null
}
