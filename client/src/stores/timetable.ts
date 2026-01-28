import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import { ALL_DAYS, TIME_CONFIG } from '@client/constants/timetable.ts'
import { i18n } from '@client/index.ts'
import { CourseUnitType, PersistedTimetableState, SelectedCourseUnit, TimetableState } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { defineStore } from 'pinia'

const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

const STORAGE_KEY = 'kreditozrouti:timetable'

/**
 * Timetable Store
 * Manages selected course units and the timetable grid.
 * Handles course unit selection constraints and drag-to-filter functionality.
 */
export const useTimetableStore = defineStore('timetable', {
	state: (): TimetableState => ({
		selectedUnits: [],
		dragSelection: {
			active: false,
			startDay: null,
			startTime: null,
			endDay: null,
			endTime: null,
		},
		showDragPopover: false,
		dragPopoverPosition: { x: 0, y: 0 },
	}),

	getters: {
		/** All selected course IDs */
		selectedCourseIds(): number[] {
			return [...new Set(this.selectedUnits.map((u) => u.courseId))]
		},

		/** All selected slot IDs */
		selectedSlotIds(): number[] {
			return this.selectedUnits.map((u) => u.slotId)
		},

		/** Group selected units by course */
		unitsByCourse(): Map<number, SelectedCourseUnit[]> {
			const map = new Map<number, SelectedCourseUnit[]>()
			for (const unit of this.selectedUnits) {
				if (!map.has(unit.courseId)) {
					map.set(unit.courseId, [])
				}
				map.get(unit.courseId)!.push(unit)
			}
			return map
		},

		/** Group selected units by day for timetable rendering */
		unitsByDay(): Map<InSISDay, SelectedCourseUnit[]> {
			const map = new Map<InSISDay, SelectedCourseUnit[]>()
			for (const day of ALL_DAYS) {
				map.set(day, [])
			}
			for (const unit of this.selectedUnits) {
				if (unit.date) {
					const slotDate = new Date(unit.date.split('.').reverse().join('-')) // Convert DD.MM.YYYY to YYYY-MM-DD
					const dateDay = ALL_DAYS[slotDate.getDay()] // 0 (Sun) to 6 (Sat)
					if (!dateDay) continue
					map.get(dateDay)?.push(unit)
				} else if (unit.day) {
					map.get(unit.day)?.push(unit)
				}
			}
			return map
		},

		/** Total ECTS of selected courses (unique courses only) */
		totalEcts(): number {
			return this.selectedCourseIds.length
		},

		/** Check for time conflicts */
		conflicts(): Array<[SelectedCourseUnit, SelectedCourseUnit]> {
			const conflictPairs: Array<[SelectedCourseUnit, SelectedCourseUnit]> = []

			for (let i = 0; i < this.selectedUnits.length; i++) {
				for (let j = i + 1; j < this.selectedUnits.length; j++) {
					const a = this.selectedUnits[i]
					const b = this.selectedUnits[j]

					if (!a || !b) continue
					if (a.day !== b.day) continue
					if (a.date && b.date && a.date !== b.date) continue

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
		},

		/** Whether there are any time conflicts */
		hasConflicts(): boolean {
			return this.conflicts.length > 0
		},

		/** Normalized drag selection (start < end) */
		normalizedDragSelection(): { day: InSISDay; timeFrom: number; timeTo: number } | null {
			const ds = this.dragSelection
			if (!ds.startDay) return null
			if (!ds.startTime || !ds.endTime) return null

			return {
				day: ds.startDay,
				timeFrom: Math.min(ds.startTime, ds.endTime),
				timeTo: Math.max(ds.startTime, ds.endTime),
			}
		},
	},

	actions: {
		/**
		 * Determine the unit type from a course unit slot
		 * Note: The type field is on the slot, not the unit
		 */
		getSlotType(slot: CourseUnitSlot): CourseUnitType {
			const slotType = slot.type?.toLowerCase() || ''

			const hasLecture = slotType.includes('přednáška') || slotType.includes('lecture')
			const hasExercise = slotType.includes('cvičení') || slotType.includes('exercise')
			const hasSeminar = slotType.includes('seminář') || slotType.includes('seminar')

			if (hasLecture) return 'lecture'
			if (hasExercise) return 'exercise'
			if (hasSeminar) return 'seminar'

			return 'lecture'
		},

		/**
		 * Check if a unit can be added (respecting constraints)
		 * Returns error message if cannot add, null if OK
		 */
		canAddUnit(
			course: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>,
			unit: CourseUnit<void, CourseUnitSlot>,
			slot: CourseUnitSlot,
		): string | null {
			if (this.selectedUnits.some((u) => u.slotId === slot.id)) {
				return t('stores.timetable.errors.slotAlreadySelected')
			}

			// for (const existing of this.selectedUnits) {
			// 	if (existing.day === slot.day && !slot.date) {
			// 		if (slot.time_from! < existing.timeTo && existing.timeFrom < slot.time_to!) {
			// 			return t('stores.timetable.errors.timeConflict', { courseIdent: existing.courseIdent })
			// 		}
			// 	} else if (slot.date && existing.day === slot.day) {
			// 		if (slot.time_from! < existing.timeTo && existing.timeFrom < slot.time_to! && slot.date === existing.date) {
			// 			return t('stores.timetable.errors.timeConflict', { courseIdent: existing.courseIdent })
			// 		}
			// 	}
			// }

			return null
		},

		/**
		 * Add a course unit to the timetable
		 */
		addUnit(
			course: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>,
			unit: CourseUnit<void, CourseUnitSlot>,
			slot: CourseUnitSlot,
		): boolean {
			const error = this.canAddUnit(course, unit, slot)
			if (error) {
				// TODO: Show error to user
				return false
			}

			const selectedUnit: SelectedCourseUnit = {
				courseId: course.id,
				courseIdent: course.ident,
				courseTitle: course.title ?? course.czech_title ?? '',
				unitId: unit.id,
				unitType: this.getSlotType(slot),
				slotId: slot.id,
				day: slot.day ?? undefined,
				date: slot.date ?? undefined,
				timeFrom: slot.time_from!,
				timeTo: slot.time_to!,
				location: slot.location ?? undefined,
				lecturer: unit.lecturer ?? undefined,
				ects: course.ects ?? undefined,
			}

			this.selectedUnits.push(selectedUnit)
			this.persist()
			return true
		},

		/**
		 * Remove a course unit from the timetable
		 */
		removeUnit(unitId: number) {
			this.selectedUnits = this.selectedUnits.filter((u) => u.unitId !== unitId)
			this.persist()
		},

		/**
		 * Remove all units for a course
		 */
		removeCourse(courseId: number) {
			this.selectedUnits = this.selectedUnits.filter((u) => u.courseId !== courseId)
			this.persist()
		},

		/**
		 * Change a unit (remove old, add new)
		 */
		changeUnit(
			course: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>,
			oldSlotId: number,
			newUnit: CourseUnit<void, CourseUnitSlot>,
			newSlot: CourseUnitSlot,
		): boolean {
			const oldIndex = this.selectedUnits.findIndex((u) => u.slotId === oldSlotId)
			const oldUnit = oldIndex !== -1 ? this.selectedUnits[oldIndex] : null

			if (oldUnit) {
				this.selectedUnits.splice(oldIndex, 1)
			}

			const error = this.canAddUnit(course, newUnit, newSlot)
			if (error) {
				if (oldUnit) {
					this.selectedUnits.splice(oldIndex, 0, oldUnit)
				}

				// TODO: Show error to user

				return false
			}

			return this.addUnit(course, newUnit, newSlot)
		},

		/**
		 * Get units for a specific course
		 */
		getUnitsForCourse(courseId: number): SelectedCourseUnit[] {
			return this.unitsByCourse.get(courseId) || []
		},

		/**
		 * Check if a course has any selected units
		 */
		hasCourseSelected(courseId: number): boolean {
			return this.selectedUnits.some((u) => u.courseId === courseId)
		},

		/**
		 * Check if a specific unit type is selected for a course
		 */
		hasUnitTypeSelected(courseId: number, unitType: CourseUnitType): boolean {
			return this.selectedUnits.some((u) => u.courseId === courseId && u.unitType === unitType)
		},

		/**
		 * Start drag selection
		 */
		startDrag(day: InSISDay, time: number) {
			this.dragSelection = {
				active: true,
				startDay: day,
				startTime: time,
				endDay: day,
				endTime: time,
			}
			this.showDragPopover = false
		},

		/**
		 * Update drag selection while dragging
		 */
		updateDrag(day: InSISDay, time: number) {
			if (!this.dragSelection.active) return

			this.dragSelection.endDay = this.dragSelection.startDay
			this.dragSelection.endTime = time
		},

		/**
		 * End drag selection
		 */
		endDrag(mouseX: number, mouseY: number) {
			if (!this.dragSelection.active) return

			this.dragSelection.active = false

			if (this.normalizedDragSelection) {
				this.dragPopoverPosition = { x: mouseX, y: mouseY }
				this.showDragPopover = true
			}
		},

		/**
		 * Cancel drag selection
		 */
		cancelDrag() {
			this.dragSelection = {
				active: false,
				startDay: null,
				startTime: null,
				endDay: null,
				endTime: null,
			}
			this.showDragPopover = false
		},

		/**
		 * Get the current drag selection values
		 */
		getDragSelectionValues(): { day: InSISDay; timeFrom: number; timeTo: number } | null {
			return this.normalizedDragSelection
		},

		/**
		 * Check if a time slot is within the current drag selection
		 */
		isInDragSelection(day: InSISDay, time: number): boolean {
			const ds = this.normalizedDragSelection
			if (!ds || !this.dragSelection.active) return false

			return day === ds.day && time >= ds.timeFrom && time < ds.timeTo
		},

		/**
		 * Get human-readable label for unit type (accusative form for error messages)
		 */
		getUnitTypeLabel(type: CourseUnitType): string {
			return t(`unitTypesAccusative.${type}`)
		},

		/**
		 * Format time from minutes to HH:MM
		 */
		formatTime(minutes: number): string {
			const hours = Math.floor(minutes / 60)
			const mins = minutes % 60
			return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
		},

		/**
		 * Generate time slots for the timetable grid
		 */
		generateTimeSlots(): number[] {
			const slots: number[] = []
			let time = TIME_CONFIG.START

			while (time < TIME_CONFIG.END) {
				slots.push(time)
				time += TIME_CONFIG.SLOT_DURATION + TIME_CONFIG.BREAK_DURATION
			}

			return slots
		},

		persist() {
			const state: PersistedTimetableState = {
				selectedUnits: this.selectedUnits,
			}
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
		},

		hydrate() {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (!stored) return

			try {
				const state: PersistedTimetableState = JSON.parse(stored)
				this.selectedUnits = state.selectedUnits || []
			} catch (e) {
				console.error('Timetable: Failed to hydrate from localStorage', e)
				localStorage.removeItem(STORAGE_KEY)
			}
		},

		/**
		 * Clear all selected units
		 */
		clearAll() {
			this.selectedUnits = []
			localStorage.removeItem(STORAGE_KEY)
		},
	},
})
