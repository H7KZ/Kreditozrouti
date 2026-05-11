import type { SelectedCourseUnit } from '@client/types'
import type { InSISDay } from '@shared/domain/insis'

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
