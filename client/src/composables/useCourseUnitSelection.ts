import { CourseWithRelations } from '@api/Database/types'
import { useCourseLabels } from '@client/composables'
import { useTimetableStore } from '@client/stores'
import { CourseUnitType, CourseUnitWithSlots, SelectedCourseUnit, UnitGroup, UnitGroupMap } from '@client/types'
import type { Ref } from 'vue'
import { computed } from 'vue'

/**
 * Options for the course unit selection composable.
 */
export interface UseCourseUnitSelectionOptions {
	/**
	 * The course to manage selection for.
	 * Can be a ref for reactive updates or null while loading.
	 */
	course: Ref<CourseWithRelations | null> | CourseWithRelations
}

/**
 * Course unit selection composable.
 *
 * @example
 * ```ts
 * const { course } = defineProps<{ course: CourseWithRelations }>()
 *
 * const {
 *   unitsByGroup,
 *   isSelectionComplete,
 *   handleAddUnit,
 *   handleRemoveUnit,
 * } = useCourseUnitSelection({ course: toRef(props, 'course') })
 * ```
 */
export function useCourseUnitSelection(options: UseCourseUnitSelectionOptions) {
	const timetableStore = useTimetableStore()
	const { getSlotType } = useCourseLabels()

	// Normalize course access (handle both Ref and direct value)
	const getCourse = (): CourseWithRelations | null => {
		const c = options.course
		return 'value' in c ? c.value : c
	}

	/**
	 * Get unique sorted unit types present in a unit's slots.
	 */
	function getUnitTypes(unit: CourseUnitWithSlots): CourseUnitType[] {
		const types = new Set<CourseUnitType>()
		for (const slot of unit.slots ?? []) {
			types.add(getSlotType(slot))
		}
		return Array.from(types).sort()
	}

	/**
	 * Group units by their type composition.
	 *
	 * Groups units that contain the same combination of types together.
	 * For example:
	 * - Key "lecture": Units containing only lectures
	 * - Key "exercise": Units containing only exercises
	 * - Key "lecture|exercise": Units containing both
	 */
	const unitsByGroup = computed((): UnitGroupMap => {
		const course = getCourse()
		const groups = new Map<string, UnitGroup>()

		if (!course) return groups

		for (const unit of course.units ?? []) {
			if (!unit.slots?.length) continue

			const types = getUnitTypes(unit)
			const key = types.join('|')

			if (!groups.has(key)) {
				groups.set(key, { types, units: [] })
			}
			groups.get(key)!.units.push(unit)
		}

		// Sort groups: single types first, then mixed
		return new Map([...groups.entries()].sort((a, b) => a[0].length - b[0].length))
	})

	/**
	 * Get currently selected units for this course from the store.
	 */
	const selectedUnits = computed((): SelectedCourseUnit[] => {
		const course = getCourse()
		if (!course) return []
		return timetableStore.getUnitsForCourse(course.id)
	})

	/**
	 * Get all unit types that need to be selected for this course.
	 */
	const requiredUnitTypes = computed((): Set<CourseUnitType> => {
		const course = getCourse()
		const types = new Set<CourseUnitType>()

		if (!course) return types

		for (const unit of course.units ?? []) {
			for (const slot of unit.slots ?? []) {
				types.add(getSlotType(slot))
			}
		}
		return types
	})

	/**
	 * Get currently selected unit types.
	 */
	const selectedUnitTypes = computed((): Set<CourseUnitType> => {
		return new Set(selectedUnits.value.map((u) => u.unitType))
	})

	/**
	 * Check if all required unit types have been selected.
	 */
	const isSelectionComplete = computed((): boolean => {
		if (requiredUnitTypes.value.size === 0) return false

		for (const type of requiredUnitTypes.value) {
			if (!selectedUnitTypes.value.has(type)) {
				return false
			}
		}
		return true
	})

	/**
	 * Check if course has some units selected but not all required types.
	 * This indicates an incomplete/inconsistent selection.
	 */
	const hasIncompleteSelection = computed((): boolean => {
		if (selectedUnits.value.length === 0) return false
		return !isSelectionComplete.value
	})

	/**
	 * Get the unit types that are still missing from selection.
	 */
	const missingUnitTypes = computed((): CourseUnitType[] => {
		const missing: CourseUnitType[] = []
		for (const type of requiredUnitTypes.value) {
			if (!selectedUnitTypes.value.has(type)) {
				missing.push(type)
			}
		}
		return missing
	})

	/**
	 * Check if a specific unit is selected.
	 */
	function isUnitSelected(unitId: number): boolean {
		return selectedUnits.value.some((u) => u.unitId === unitId)
	}

	/**
	 * Check if a specific slot is selected.
	 */
	function isSlotSelected(slotId: number): boolean {
		return selectedUnits.value.some((u) => u.slotId === slotId)
	}

	/**
	 * Check if a group of unit types is fully satisfied.
	 * Returns true if all types in the group have been selected.
	 */
	function isGroupSatisfied(types: CourseUnitType[]): boolean {
		return types.every((t) => selectedUnitTypes.value.has(t))
	}

	/**
	 * Add all slots from a unit to the timetable.
	 *
	 * If the unit's types conflict with existing selections,
	 * the old units are removed first (swap behavior).
	 */
	function handleAddUnit(unit: CourseUnitWithSlots): boolean {
		const course = getCourse()
		if (!course || !unit.slots) return false

		// Identify types in this unit
		const typesInUnit = getUnitTypes(unit)

		// Find existing selected units that clash with these types
		const unitsToRemove: number[] = []
		for (const type of typesInUnit) {
			const existing = selectedUnits.value.find((u) => u.unitType === type)
			if (existing) {
				unitsToRemove.push(existing.unitId)
			}
		}

		// Remove conflicting units first
		unitsToRemove.forEach((id) => timetableStore.removeUnit(id))

		// Add all slots from this unit
		let allSuccess = true
		for (const slot of unit.slots) {
			const success = timetableStore.addUnit(course, unit, slot)
			if (!success) {
				// Rollback on failure
				timetableStore.removeUnit(slot.unit_id)
				allSuccess = false
			}
		}

		return allSuccess
	}

	/**
	 * Remove all slots for a unit from the timetable.
	 */
	function handleRemoveUnit(unit: CourseUnitWithSlots): void {
		if (!unit.slots) return

		for (const slot of unit.slots) {
			timetableStore.removeUnit(slot.unit_id)
		}
	}

	/**
	 * Remove all units for the entire course from the timetable.
	 */
	function handleRemoveCourse(): void {
		const course = getCourse()
		if (!course) return
		timetableStore.removeCourse(course.id)
	}

	/**
	 * Toggle unit selection - add if not selected, remove if selected.
	 */
	function toggleUnit(unit: CourseUnitWithSlots): void {
		if (isUnitSelected(unit.id)) {
			handleRemoveUnit(unit)
		} else {
			handleAddUnit(unit)
		}
	}

	return {
		// Computed state
		unitsByGroup,
		selectedUnits,
		requiredUnitTypes,
		selectedUnitTypes,
		isSelectionComplete,
		hasIncompleteSelection,
		missingUnitTypes,

		// Utility functions
		getUnitTypes,
		isUnitSelected,
		isSlotSelected,
		isGroupSatisfied,

		// Actions
		handleAddUnit,
		handleRemoveUnit,
		handleRemoveCourse,
		toggleUnit,
	}
}
