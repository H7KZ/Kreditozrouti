import type { Day } from '@kreditozrouti/types'
import type { SelectedCourseUnit } from '@web/types'

export interface DragSelection {
	active: boolean
	startDay: Day | null
	startTime: number | null
	endDay: Day | null
	endTime: number | null
}

export interface PersistedTimetableState {
	selectedUnits: SelectedCourseUnit[]
}

export interface SavedScheduleSlot {
	id: string
	name: string
	units: SelectedCourseUnit[]
	createdAt: number
	updatedAt: number
}

export interface PersistedScheduleSlotsState {
	slots: SavedScheduleSlot[]
	activeSlotId: string | null
}
