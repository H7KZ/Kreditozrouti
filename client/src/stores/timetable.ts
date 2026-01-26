import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import { i18n } from '@client/index.ts'
import { CourseUnitType, DragSelection, SelectedCourseUnit } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

const STORAGE_KEY = 'kreditozrouti:timetable'

// Days in order for the timetable grid
export const WEEKDAYS: InSISDay[] = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek']

export const ALL_DAYS: InSISDay[] = [...WEEKDAYS, 'Sobota', 'Neděle']

// Time grid configuration (in minutes from midnight)
export const TIME_CONFIG = {
	START: 7 * 60 + 30, // 7:30
	END: 20 * 60, // 20:00
	SLOT_DURATION: 45, // 45 minutes per slot
	BREAK_DURATION: 15, // 15 minutes break
} as const

type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

interface PersistedTimetableState {
	selectedUnits: SelectedCourseUnit[]
}

/**
 * Timetable Store
 * Manages selected course units and the timetable grid.
 * Handles course unit selection constraints and drag-to-filter functionality.
 */
export const useTimetableStore = defineStore('timetable', () => {
	/** Selected course units */
	const selectedUnits = ref<SelectedCourseUnit[]>([])

	/** Drag selection state for drag-to-filter */
	const dragSelection = ref<DragSelection>({
		active: false,
		startDay: null,
		startTime: null,
		endDay: null,
		endTime: null,
	})

	/** Whether drag-to-filter popover should be shown */
	const showDragPopover = ref(false)

	/** Position of the drag popover */
	const dragPopoverPosition = ref({ x: 0, y: 0 })

	/** All selected course IDs */
	const selectedCourseIds = computed(() => [...new Set(selectedUnits.value.map((u) => u.courseId))])

	/** All selected slot IDs */
	const selectedSlotIds = computed(() => selectedUnits.value.map((u) => u.slotId))

	/** Group selected units by course */
	const unitsByCourse = computed(() => {
		const map = new Map<number, SelectedCourseUnit[]>()
		for (const unit of selectedUnits.value) {
			if (!map.has(unit.courseId)) {
				map.set(unit.courseId, [])
			}
			map.get(unit.courseId)!.push(unit)
		}
		return map
	})

	/** Group selected units by day for timetable rendering */
	const unitsByDay = computed(() => {
		const map = new Map<InSISDay, SelectedCourseUnit[]>()
		for (const day of ALL_DAYS) {
			map.set(day, [])
		}
		for (const unit of selectedUnits.value) {
			map.get(unit.day)?.push(unit)
		}
		return map
	})

	/** Total ECTS of selected courses (unique courses only) */
	const totalEcts = computed(() => {
		// This would need course data - for now return count
		return selectedCourseIds.value.length
	})

	/** Check for time conflicts */
	const conflicts = computed(() => {
		const conflictPairs: Array<[SelectedCourseUnit, SelectedCourseUnit]> = []

		for (let i = 0; i < selectedUnits.value.length; i++) {
			for (let j = i + 1; j < selectedUnits.value.length; j++) {
				const a = selectedUnits.value[i]
				const b = selectedUnits.value[j]

				if (!a || !b) continue
				if (a.day !== b.day) continue

				// Check time overlap
				const aStart = a.timeFrom
				const aEnd = a.timeTo
				const bStart = b.timeFrom
				const bEnd = b.timeTo

				if (aStart < bEnd && bStart < aEnd) {
					conflictPairs.push([a, b])
				}
			}
		}

		return conflictPairs
	})

	/** Whether there are any time conflicts */
	const hasConflicts = computed(() => conflicts.value.length > 0)

	/** Normalized drag selection (start < end) */
	const normalizedDragSelection = computed(() => {
		const ds = dragSelection.value
		if (!ds.startDay) return null
		if (!ds.startTime || !ds.endTime) return null

		return {
			day: ds.startDay,
			timeFrom: Math.min(ds.startTime, ds.endTime),
			timeTo: Math.max(ds.startTime, ds.endTime),
		}
	})

	/**
	 * Determine the unit type from a course unit slot
	 * Note: The type field is on the slot, not the unit
	 */
	function getSlotType(slot: CourseUnitSlot): CourseUnitType {
		const slotType = slot.type?.toLowerCase() || ''

		const hasLecture = slotType.includes('přednáška') || slotType.includes('lecture')
		const hasExercise = slotType.includes('cvičení') || slotType.includes('exercise')
		const hasSeminar = slotType.includes('seminář') || slotType.includes('seminar')

		if (hasLecture && hasExercise) return 'combined'
		if (hasLecture) return 'lecture'
		if (hasExercise) return 'exercise'
		if (hasSeminar) return 'seminar'

		// Default based on common patterns
		return 'lecture'
	}

	/**
	 * Check if a unit can be added (respecting constraints)
	 * Returns error message if cannot add, null if OK
	 */
	function canAddUnit(course: CourseWithRelations, unit: CourseUnit<void, CourseUnitSlot>, slot: CourseUnitSlot): string | null {
		const slotType = getSlotType(slot)
		const courseUnits = unitsByCourse.value.get(course.id) || []

		// Check if this exact slot is already selected
		if (selectedUnits.value.some((u) => u.slotId === slot.id)) {
			return t('stores.timetable.errors.slotAlreadySelected')
		}

		// Check if a unit of the same type is already selected for this course
		const existingOfType = courseUnits.find((u) => u.unitType === slotType)
		if (existingOfType) {
			return t('stores.timetable.errors.unitTypeAlreadySelected', { unitType: getUnitTypeLabel(slotType) })
		}

		// Check for time conflicts
		for (const existing of selectedUnits.value) {
			if (existing.day === slot.day) {
				if (slot.time_from! < existing.timeTo && existing.timeFrom < slot.time_to!) {
					return t('stores.timetable.errors.timeConflict', { courseIdent: existing.courseIdent })
				}
			}
		}

		return null
	}

	/**
	 * Add a course unit to the timetable
	 */
	function addUnit(course: CourseWithRelations, unit: CourseUnit<void, CourseUnitSlot>, slot: CourseUnitSlot): boolean {
		const error = canAddUnit(course, unit, slot)
		if (error) {
			console.warn('Cannot add unit:', error)
			return false
		}

		const selectedUnit: SelectedCourseUnit = {
			courseId: course.id,
			courseIdent: course.ident,
			courseTitle: course.title ?? course.czech_title ?? '',
			unitId: unit.id,
			unitType: getSlotType(slot),
			slotId: slot.id,
			day: slot.day as InSISDay,
			timeFrom: slot.time_from!,
			timeTo: slot.time_to!,
			room: slot.location ?? undefined, // location field on slot
			lecturer: unit.lecturer ?? undefined, // lecturer is on unit, not slot
			ects: course.ects ?? undefined,
		}

		selectedUnits.value.push(selectedUnit)
		persist()
		return true
	}

	/**
	 * Remove a course unit from the timetable
	 */
	function removeUnit(slotId: number) {
		const index = selectedUnits.value.findIndex((u) => u.slotId === slotId)
		if (index !== -1) {
			selectedUnits.value.splice(index, 1)
			persist()
		}
	}

	/**
	 * Remove all units for a course
	 */
	function removeCourse(courseId: number) {
		selectedUnits.value = selectedUnits.value.filter((u) => u.courseId !== courseId)
		persist()
	}

	/**
	 * Change a unit (remove old, add new)
	 */
	function changeUnit(course: CourseWithRelations, oldSlotId: number, newUnit: CourseUnit<void, CourseUnitSlot>, newSlot: CourseUnitSlot): boolean {
		// Temporarily remove old unit to check if new can be added
		const oldIndex = selectedUnits.value.findIndex((u) => u.slotId === oldSlotId)
		const oldUnit = oldIndex !== -1 ? selectedUnits.value[oldIndex] : null

		if (oldUnit) {
			selectedUnits.value.splice(oldIndex, 1)
		}

		const error = canAddUnit(course, newUnit, newSlot)
		if (error) {
			// Restore old unit
			if (oldUnit) {
				selectedUnits.value.splice(oldIndex, 0, oldUnit)
			}
			console.warn('Cannot change unit:', error)
			return false
		}

		// Add new unit
		return addUnit(course, newUnit, newSlot)
	}

	/**
	 * Get units for a specific course
	 */
	function getUnitsForCourse(courseId: number): SelectedCourseUnit[] {
		return unitsByCourse.value.get(courseId) || []
	}

	/**
	 * Check if a course has any selected units
	 */
	function hasCourseSelected(courseId: number): boolean {
		return selectedUnits.value.some((u) => u.courseId === courseId)
	}

	/**
	 * Check if a specific unit type is selected for a course
	 */
	function hasUnitTypeSelected(courseId: number, unitType: CourseUnitType): boolean {
		return selectedUnits.value.some((u) => u.courseId === courseId && u.unitType === unitType)
	}

	/**
	 * Start drag selection
	 */
	function startDrag(day: InSISDay, time: number) {
		dragSelection.value = {
			active: true,
			startDay: day,
			startTime: time,
			endDay: day,
			endTime: time,
		}
		showDragPopover.value = false
	}

	/**
	 * Update drag selection while dragging
	 */
	function updateDrag(day: InSISDay, time: number) {
		if (!dragSelection.value.active) return

		// Only allow dragging within the same day
		dragSelection.value.endDay = dragSelection.value.startDay
		dragSelection.value.endTime = time
	}

	/**
	 * End drag selection
	 */
	function endDrag(mouseX: number, mouseY: number) {
		if (!dragSelection.value.active) return

		dragSelection.value.active = false

		// Show popover if we have a valid selection
		if (normalizedDragSelection.value) {
			dragPopoverPosition.value = { x: mouseX, y: mouseY }
			showDragPopover.value = true
		}
	}

	/**
	 * Cancel drag selection
	 */
	function cancelDrag() {
		dragSelection.value = {
			active: false,
			startDay: null,
			startTime: null,
			endDay: null,
			endTime: null,
		}
		showDragPopover.value = false
	}

	/**
	 * Get the current drag selection values
	 */
	function getDragSelectionValues(): {
		day: InSISDay
		timeFrom: number
		timeTo: number
	} | null {
		return normalizedDragSelection.value
	}

	/**
	 * Check if a time slot is within the current drag selection
	 */
	function isInDragSelection(day: InSISDay, time: number): boolean {
		const ds = normalizedDragSelection.value
		if (!ds || !dragSelection.value.active) return false

		return day === ds.day && time >= ds.timeFrom && time < ds.timeTo
	}

	/**
	 * Get human-readable label for unit type (accusative form for error messages)
	 */
	function getUnitTypeLabel(type: CourseUnitType): string {
		return t(`unitTypesAccusative.${type}`)
	}

	/**
	 * Format time from minutes to HH:MM
	 */
	function formatTime(minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
	}

	/**
	 * Generate time slots for the timetable grid
	 */
	function generateTimeSlots(): number[] {
		const slots: number[] = []
		let time = TIME_CONFIG.START

		while (time < TIME_CONFIG.END) {
			slots.push(time)
			time += TIME_CONFIG.SLOT_DURATION + TIME_CONFIG.BREAK_DURATION
		}

		return slots
	}

	function persist() {
		const state: PersistedTimetableState = {
			selectedUnits: selectedUnits.value,
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	}

	function hydrate() {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return

		try {
			const state: PersistedTimetableState = JSON.parse(stored)
			selectedUnits.value = state.selectedUnits || []
		} catch (e) {
			console.error('Timetable: Failed to hydrate from localStorage', e)
			localStorage.removeItem(STORAGE_KEY)
		}
	}

	/**
	 * Clear all selected units
	 */
	function clearAll() {
		selectedUnits.value = []
		localStorage.removeItem(STORAGE_KEY)
	}

	// Hydrate on store creation
	hydrate()

	return {
		// State
		selectedUnits,
		dragSelection,
		showDragPopover,
		dragPopoverPosition,

		// Computed
		selectedCourseIds,
		selectedSlotIds,
		unitsByCourse,
		unitsByDay,
		totalEcts,
		conflicts,
		hasConflicts,
		normalizedDragSelection,

		// Actions
		getSlotType,
		canAddUnit,
		addUnit,
		removeUnit,
		removeCourse,
		changeUnit,
		getUnitsForCourse,
		hasCourseSelected,
		hasUnitTypeSelected,

		// Drag selection
		startDrag,
		updateDrag,
		endDrag,
		cancelDrag,
		getDragSelectionValues,
		isInDragSelection,

		// Utilities
		getUnitTypeLabel,
		formatTime,
		generateTimeSlots,

		// Persistence
		clearAll,
	}
})
