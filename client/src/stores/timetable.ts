import { TimeSelection, TimetableSlot } from '@api/Interfaces/Timetable.ts'
import InSISDay, { InSISDayValues } from '@scraper/Types/InSISDay.ts'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

export interface TimetableCell {
	day: InSISDay
	timeSlot: number // Minutes from midnight (e.g., 7*60 + 30 = 450 for 7:30)
}

export interface DragSelection {
	isActive: boolean
	startCell: TimetableCell | null
	endCell: TimetableCell | null
}

export const TIMETABLE_START_HOUR = 7 // 7:00
export const TIMETABLE_END_HOUR = 21 // 21:00
export const SLOT_DURATION = 15 // 15-minute slots

export const useTimeTableStore = defineStore('timetable', () => {
	// State
	const slots = ref<TimetableSlot[]>([])
	const excludedTimes = ref<TimeSelection[]>([])

	// Drag selection state
	const dragSelection = reactive<DragSelection>({
		isActive: false,
		startCell: null,
		endCell: null,
	})

	// Selected time ranges from drag
	const selectedTimeRanges = ref<TimeSelection[]>([])

	// View settings
	const showWeekend = ref(false)
	const zoomLevel = ref(1) // 1 = normal, 0.5 = compact, 2 = expanded

	// Computed
	const days = computed((): InSISDay[] => {
		return showWeekend.value ? [...InSISDayValues] : InSISDayValues.slice(0, 5)
	})

	const timeSlots = computed(() => {
		const slots: number[] = []
		for (let hour = TIMETABLE_START_HOUR; hour < TIMETABLE_END_HOUR; hour++) {
			for (let minute = 0; minute < 60; minute += SLOT_DURATION) {
				slots.push(hour * 60 + minute)
			}
		}
		return slots
	})

	const hourMarkers = computed(() => {
		const markers: number[] = []
		for (let hour = TIMETABLE_START_HOUR; hour <= TIMETABLE_END_HOUR; hour++) {
			markers.push(hour * 60)
		}
		return markers
	})

	// Get slots for a specific day and time range
	const getSlotsForCell = computed(() => {
		return (day: InSISDay, timeFrom: number, timeTo: number) => {
			return slots.value.filter((slot) => slot.day === day && slot.time_from < timeTo && slot.time_to > timeFrom)
		}
	})

	// Check if a cell is in the current drag selection
	const isCellInSelection = computed(() => {
		return (day: InSISDay, timeSlot: number) => {
			if (!dragSelection.isActive || !dragSelection.startCell || !dragSelection.endCell) {
				return false
			}

			const dayIndex = days.value.indexOf(day)
			const startDayIndex = days.value.indexOf(dragSelection.startCell.day)
			const endDayIndex = days.value.indexOf(dragSelection.endCell.day)

			const minDay = Math.min(startDayIndex, endDayIndex)
			const maxDay = Math.max(startDayIndex, endDayIndex)
			const minTime = Math.min(dragSelection.startCell.timeSlot, dragSelection.endCell.timeSlot)
			const maxTime = Math.max(dragSelection.startCell.timeSlot, dragSelection.endCell.timeSlot)

			return dayIndex >= minDay && dayIndex <= maxDay && timeSlot >= minTime && timeSlot <= maxTime
		}
	})

	// Check if a cell is in a selected time range
	const isCellSelected = computed(() => {
		return (day: InSISDay, timeSlot: number) => {
			return selectedTimeRanges.value.some((range) => range.day === day && timeSlot >= range.time_from && timeSlot < range.time_to)
		}
	})

	// Check if a time is excluded
	const isTimeExcluded = computed(() => {
		return (day: InSISDay, timeSlot: number) => {
			return excludedTimes.value.some((excl) => excl.day === day && timeSlot >= excl.time_from && timeSlot < excl.time_to)
		}
	})

	// Current selection bounds (for display)
	const currentSelectionBounds = computed(() => {
		if (!dragSelection.isActive || !dragSelection.startCell || !dragSelection.endCell) {
			return null
		}

		const startDayIndex = days.value.indexOf(dragSelection.startCell.day)
		const endDayIndex = days.value.indexOf(dragSelection.endCell.day)

		return {
			days: days.value.slice(Math.min(startDayIndex, endDayIndex), Math.max(startDayIndex, endDayIndex) + 1),
			time_from: Math.min(dragSelection.startCell.timeSlot, dragSelection.endCell.timeSlot),
			time_to: Math.max(dragSelection.startCell.timeSlot, dragSelection.endCell.timeSlot) + SLOT_DURATION,
		}
	})

	// Actions
	function setSlots(newSlots: TimetableSlot[]) {
		slots.value = newSlots
	}

	function addSlot(slot: TimetableSlot) {
		slots.value.push(slot)
	}

	function removeSlot(slotId: number) {
		const index = slots.value.findIndex((s) => s.slot_id === slotId)
		if (index !== -1) {
			slots.value.splice(index, 1)
		}
	}

	function startDrag(cell: TimetableCell) {
		dragSelection.isActive = true
		dragSelection.startCell = { ...cell }
		dragSelection.endCell = { ...cell }
	}

	function updateDrag(cell: TimetableCell) {
		if (dragSelection.isActive) {
			dragSelection.endCell = { ...cell }
		}
	}

	function endDrag() {
		if (dragSelection.isActive && dragSelection.startCell && dragSelection.endCell) {
			const bounds = currentSelectionBounds.value
			if (bounds) {
				// Add selection for each day in the range
				bounds.days.forEach((day) => {
					selectedTimeRanges.value.push({
						day,
						time_from: bounds.time_from,
						time_to: bounds.time_to,
					})
				})
			}
		}
		cancelDrag()
	}

	function cancelDrag() {
		dragSelection.isActive = false
		dragSelection.startCell = null
		dragSelection.endCell = null
	}

	function clearSelection() {
		selectedTimeRanges.value = []
	}

	function removeSelection(index: number) {
		selectedTimeRanges.value.splice(index, 1)
	}

	function addExcludedTime(exclusion: TimeSelection) {
		excludedTimes.value.push(exclusion)
	}

	function removeExcludedTime(index: number) {
		excludedTimes.value.splice(index, 1)
	}

	function clearExcludedTimes() {
		excludedTimes.value = []
	}

	// Convert selection to exclusions (for "I don't want classes at this time")
	function convertSelectionToExclusions() {
		selectedTimeRanges.value.forEach((range) => {
			excludedTimes.value.push({
				day: range.day,
				time_from: range.time_from,
				time_to: range.time_to,
			})
		})
		clearSelection()
	}

	function setShowWeekend(show: boolean) {
		showWeekend.value = show
	}

	function setZoomLevel(level: number) {
		zoomLevel.value = level
	}

	function reset() {
		slots.value = []
		excludedTimes.value = []
		selectedTimeRanges.value = []
		cancelDrag()
	}

	// Utility: Format time from minutes
	function formatTime(minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours}:${mins.toString().padStart(2, '0')}`
	}

	// Utility: Get cell position (for absolute positioning)
	function getCellPosition(day: InSISDay, timeFrom: number, timeTo: number) {
		const dayIndex = days.value.indexOf(day)
		const startSlotIndex = Math.floor((timeFrom - TIMETABLE_START_HOUR * 60) / SLOT_DURATION)
		const duration = timeTo - timeFrom
		const slotCount = Math.ceil(duration / SLOT_DURATION)

		return {
			dayIndex,
			startSlotIndex,
			slotCount,
			duration,
		}
	}

	return {
		// State
		slots,
		excludedTimes,
		dragSelection,
		selectedTimeRanges,
		showWeekend,
		zoomLevel,

		// Computed
		days,
		timeSlots,
		hourMarkers,
		getSlotsForCell,
		isCellInSelection,
		isCellSelected,
		isTimeExcluded,
		currentSelectionBounds,

		// Actions
		setSlots,
		addSlot,
		removeSlot,
		startDrag,
		updateDrag,
		endDrag,
		cancelDrag,
		clearSelection,
		removeSelection,
		addExcludedTime,
		removeExcludedTime,
		clearExcludedTimes,
		convertSelectionToExclusions,
		setShowWeekend,
		setZoomLevel,
		reset,

		// Utilities
		formatTime,
		getCellPosition,
	}
})
