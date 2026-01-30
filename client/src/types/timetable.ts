import { SelectedCourseUnit } from '@client/types/course.ts'
import InSISDay from '@scraper/Types/InSISDay.ts'

/** Drag selection state for timetable */
export interface DragSelection {
	active: boolean
	startDay: InSISDay | null
	startTime: number | null
	endDay: InSISDay | null
	endTime: number | null
}

export interface PersistedTimetableState {
	selectedUnits: SelectedCourseUnit[]
}

export interface TimetableState {
	selectedUnits: SelectedCourseUnit[]
	dragSelection: DragSelection
	showDragPopover: boolean
	dragPopoverPosition: { x: number; y: number }
}
