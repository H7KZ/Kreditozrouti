import type { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import { useCourseLabels } from '@client/composables'
import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { ALL_DAYS } from '@client/constants/timetable'
import { i18n } from '@client/index'
import { useCoursesStore } from '@client/stores'
import type { CourseStatus, CourseUnitType, PersistedTimetableState, SelectedCourseUnit, TimetableState } from '@client/types'
import { getDayFromDate } from '@client/utils/day'
import { loadFromStorage, removeFromStorage, saveToStorage } from '@client/utils/localstorage.ts'
import type InSISDay from '@scraper/Types/InSISDay'
import { defineStore } from 'pinia'

const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

/**
 * Timetable Store
 *
 * Manages selected course units and the timetable grid.
 * Handles course unit selection constraints and drag-to-filter functionality.
 *
 * Refactored with:
 * - Cleaner course status computation
 * - Extracted helper functions for readability
 * - Improved conflict detection
 * - Better separation of concerns
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
		/** All selected course IDs (unique) */
		selectedCourseIds(): number[] {
			return [...new Set(this.selectedUnits.map((u) => u.courseId))]
		},

		/** All selected slot IDs */
		selectedSlotIds(): number[] {
			return this.selectedUnits.map((u) => u.slotId)
		},

		/** Group selected units by course ID */
		unitsByCourse(): Map<number, SelectedCourseUnit[]> {
			const map = new Map<number, SelectedCourseUnit[]>()
			for (const unit of this.selectedUnits) {
				const existing = map.get(unit.courseId) || []
				existing.push(unit)
				map.set(unit.courseId, existing)
			}
			return map
		},

		/** Group selected units by day for timetable rendering */
		unitsByDay(): Map<InSISDay, SelectedCourseUnit[]> {
			const map = new Map<InSISDay, SelectedCourseUnit[]>()

			// Initialize all days
			for (const day of ALL_DAYS) {
				map.set(day, [])
			}

			// Group units by day
			for (const unit of this.selectedUnits) {
				const day = unit.date ? getDayFromDate(unit.date) : unit.day
				if (day) {
					map.get(day)?.push(unit)
				}
			}

			return map
		},

		/** Total ECTS of selected courses (unique courses only) */
		totalEcts(): number {
			const seen = new Set<number>()
			let total = 0

			for (const unit of this.selectedUnits) {
				if (!seen.has(unit.courseId) && unit.ects) {
					total += unit.ects
					seen.add(unit.courseId)
				}
			}

			return total
		},

		/**
		 * Detect time conflicts between selected units.
		 * Returns pairs of conflicting units.
		 */
		conflicts(): Array<[SelectedCourseUnit, SelectedCourseUnit]> {
			const conflictPairs: Array<[SelectedCourseUnit, SelectedCourseUnit]> = []
			const { unitsConflict } = useTimetableStore()

			for (let i = 0; i < this.selectedUnits.length; i++) {
				for (let j = i + 1; j < this.selectedUnits.length; j++) {
					const a = this.selectedUnits[i]
					const b = this.selectedUnits[j]

					if (!a || !b) continue
					if (unitsConflict(a, b)) {
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

		/**
		 * Map of courseId to the course idents it conflicts with.
		 * Used for displaying conflict information.
		 */
		coursesWithConflicts(): Map<number, Set<string>> {
			const conflictMap = new Map<number, Set<string>>()

			for (const [a, b] of this.conflicts) {
				// Add bidirectional conflict entries
				if (!conflictMap.has(a.courseId)) {
					conflictMap.set(a.courseId, new Set())
				}
				conflictMap.get(a.courseId)!.add(b.courseIdent)

				if (!conflictMap.has(b.courseId)) {
					conflictMap.set(b.courseId, new Set())
				}
				conflictMap.get(b.courseId)!.add(a.courseIdent)
			}

			return conflictMap
		},

		/**
		 * Comprehensive status for all selected courses.
		 * Computes conflict and incomplete states for UI display.
		 */
		courseStatuses(): Map<number, CourseStatus> {
			const statuses = new Map<number, CourseStatus>()
			const { checkCourseCompleteness } = useTimetableStore()
			const coursesStore = useCoursesStore()
			const { getSlotType } = useCourseLabels()

			for (const courseId of this.selectedCourseIds) {
				const units = this.unitsByCourse.get(courseId) || []
				if (units.length === 0) continue

				const firstUnit = units[0]!
				const fullCourse = coursesStore.courses.find((c) => c.id === courseId)

				// Check for conflicts
				const conflictsWith = this.coursesWithConflicts.get(courseId)
				const hasConflict = conflictsWith !== undefined && conflictsWith.size > 0

				// Check for incomplete selection
				const { isIncomplete, missingTypes } = checkCourseCompleteness(units, fullCourse, getSlotType)

				// Determine status (conflict takes priority)
				const status = hasConflict ? 'conflict' : isIncomplete ? 'incomplete' : 'selected'

				statuses.set(courseId, {
					id: courseId,
					ident: firstUnit.courseIdent,
					title: firstUnit.courseTitle,
					status,
					conflictsWith: conflictsWith ? [...conflictsWith] : [],
					missingTypes,
				})
			}

			return statuses
		},

		/** Count of courses with issues (conflicts or incomplete) */
		coursesWithIssuesCount(): number {
			let count = 0
			for (const status of this.courseStatuses.values()) {
				if (status.status !== 'selected') {
					count++
				}
			}
			return count
		},

		/** Normalized drag selection (ensures start < end for time) */
		normalizedDragSelection(): { day: InSISDay; timeFrom: number; timeTo: number } | null {
			const ds = this.dragSelection
			if (!ds.startDay || !ds.startTime || !ds.endTime) return null

			return {
				day: ds.startDay,
				timeFrom: Math.min(ds.startTime, ds.endTime),
				timeTo: Math.max(ds.startTime, ds.endTime),
			}
		},
	},

	actions: {
		/**
		 * Internal helper: Check if two units have a time conflict
		 */
		unitsConflict(a: SelectedCourseUnit, b: SelectedCourseUnit): boolean {
			// Get day for each unit
			const aDay = a.day ?? (a.date ? getDayFromDate(a.date) : null)
			const bDay = b.day ?? (b.date ? getDayFromDate(b.date) : null)

			// Must be on the same day
			if (!aDay || !bDay || aDay !== bDay) return false

			// If both have specific dates, they must match
			if (a.date && b.date && a.date !== b.date) return false

			// Check time overlap
			return a.timeFrom < b.timeTo && b.timeFrom < a.timeTo
		},

		/**
		 * Internal helper: Check if a course selection is complete
		 */
		checkCourseCompleteness(
			selectedUnits: SelectedCourseUnit[],
			fullCourse: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse> | undefined,
			getSlotType: (slot: CourseUnitSlot) => CourseUnitType,
		): { isIncomplete: boolean; missingTypes: CourseUnitType[] } {
			if (!fullCourse) {
				return { isIncomplete: false, missingTypes: [] }
			}

			// Get all available unit types from the course
			const availableTypes = new Set<CourseUnitType>()
			for (const unit of fullCourse.units || []) {
				for (const slot of unit.slots || []) {
					availableTypes.add(getSlotType(slot))
				}
			}

			// Get selected unit types
			const selectedTypes = new Set(selectedUnits.map((u) => u.unitType))

			// Find missing types
			const missingTypes: CourseUnitType[] = []
			for (const type of availableTypes) {
				if (!selectedTypes.has(type)) {
					missingTypes.push(type)
				}
			}

			// Incomplete if we have some types selected but not all
			const isIncomplete = missingTypes.length > 0 && selectedTypes.size > 0

			return { isIncomplete, missingTypes }
		},

		/**
		 * Check if a unit can be added (validation)
		 */
		canAddUnit(
			course: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>,
			unit: CourseUnit<void, CourseUnitSlot>,
			slot: CourseUnitSlot,
		): string | null {
			if (this.selectedUnits.some((u) => u.slotId === slot.id)) {
				return t('stores.timetable.errors.slotAlreadySelected')
			}
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
			const { getSlotType } = useCourseLabels()

			const error = this.canAddUnit(course, unit, slot)
			if (error) return false

			const selectedUnit: SelectedCourseUnit = {
				courseId: course.id,
				courseIdent: course.ident,
				courseTitle: course.title ?? course.title_en ?? course.title_cs ?? '',
				unitId: unit.id,
				unitType: getSlotType(slot),
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
		 * Remove a course unit by unit ID
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
		 * Change a unit (atomic remove old + add new)
		 */
		changeUnit(
			course: Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>,
			oldSlotId: number,
			newUnit: CourseUnit<void, CourseUnitSlot>,
			newSlot: CourseUnitSlot,
		): boolean {
			const oldIndex = this.selectedUnits.findIndex((u) => u.slotId === oldSlotId)
			const oldUnit = oldIndex !== -1 ? this.selectedUnits[oldIndex] : null

			// Remove old unit temporarily
			if (oldUnit) {
				this.selectedUnits.splice(oldIndex, 1)
			}

			// Validate new unit
			const error = this.canAddUnit(course, newUnit, newSlot)
			if (error) {
				// Restore old unit on failure
				if (oldUnit) {
					this.selectedUnits.splice(oldIndex, 0, oldUnit)
				}
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
		 * Check if course has missing unit types (partial selection)
		 */
		courseHasMissingUnitTypes(courseId: number): boolean {
			const status = this.courseStatuses.get(courseId)
			return status?.status === 'incomplete'
		},

		/**
		 * Get the status of a specific course
		 */
		getCourseStatus(courseId: number): CourseStatus | undefined {
			return this.courseStatuses.get(courseId)
		},

		/**
		 * Get required unit types for a course's units
		 */
		requiredUnitTypes(units: CourseUnit<void, CourseUnitSlot>[]): Set<CourseUnitType> {
			const { getSlotType } = useCourseLabels()
			const types = new Set<CourseUnitType>()

			for (const unit of units || []) {
				for (const slot of unit.slots || []) {
					types.add(getSlotType(slot))
				}
			}

			return types
		},

		// ========================================
		// Drag Selection Actions
		// ========================================

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

		updateDrag(day: InSISDay, time: number) {
			if (!this.dragSelection.active) return
			this.dragSelection.endDay = this.dragSelection.startDay
			this.dragSelection.endTime = time
		},

		endDrag(mouseX: number, mouseY: number) {
			if (!this.dragSelection.active) return

			this.dragSelection.active = false

			if (this.normalizedDragSelection) {
				this.dragPopoverPosition = { x: mouseX, y: mouseY }
				this.showDragPopover = true
			}
		},

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

		getDragSelectionValues(): { day: InSISDay; timeFrom: number; timeTo: number } | null {
			return this.normalizedDragSelection
		},

		isInDragSelection(day: InSISDay, time: number): boolean {
			const ds = this.normalizedDragSelection
			if (!ds || !this.dragSelection.active) return false
			return day === ds.day && time >= ds.timeFrom && time < ds.timeTo
		},

		// ========================================
		// Persistence Actions
		// ========================================

		persist() {
			const state: PersistedTimetableState = {
				selectedUnits: this.selectedUnits,
			}
			saveToStorage(STORAGE_KEYS.TIMETABLE, state)
		},

		hydrate() {
			const state = loadFromStorage<PersistedTimetableState>(STORAGE_KEYS.TIMETABLE)
			if (state?.selectedUnits) {
				this.selectedUnits = state.selectedUnits
			}
		},

		clearAll() {
			this.selectedUnits = []
			removeFromStorage(STORAGE_KEYS.TIMETABLE)
		},
	},
})
