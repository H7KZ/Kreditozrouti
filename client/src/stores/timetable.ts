import { Course, CourseUnit, CourseUnitSlot } from '@api/Database/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface TimetableEntry {
	course: Course
	unit: CourseUnit<Course, CourseUnitSlot<Course, CourseUnit>>
	addedAt: Date
}

export const useTimetableStore = defineStore('timetable', () => {
	// ---- State ----
	// Map of unit ID -> TimetableEntry
	const entries = ref<Map<number, TimetableEntry>>(new Map())

	// ---- Computed ----

	/**
	 * All timetable entries as an array
	 */
	const allEntries = computed(() => Array.from(entries.value.values()))

	/**
	 * All time slots from all units
	 */
	const allSlots = computed(() => {
		const slots: CourseUnitSlot<Course, CourseUnit<Course, CourseUnitSlot<Course, CourseUnit>>>[] = []

		for (const entry of entries.value.values()) {
			for (const slot of entry.unit.slots || []) {
				slots.push({ ...slot, course: entry.course, unit: entry.unit })
			}
		}

		return slots
	})

	/**
	 * Total credits from all courses (count each course only once)
	 */
	const totalCredits = computed(() => {
		const courseIds = new Set<number>()
		let credits = 0
		for (const entry of entries.value.values()) {
			if (!courseIds.has(entry.course.id)) {
				courseIds.add(entry.course.id)
				credits += entry.course.ects || 0
			}
		}
		return credits
	})

	/**
	 * Check if timetable is empty
	 */
	const isEmpty = computed(() => entries.value.size === 0)

	/**
	 * Get all unique courses in the timetable
	 */
	const uniqueCourses = computed(() => {
		const courseMap = new Map<number, Course>()
		for (const entry of entries.value.values()) {
			if (!courseMap.has(entry.course.id)) {
				courseMap.set(entry.course.id, entry.course)
			}
		}
		return Array.from(courseMap.values())
	})

	// ---- Actions ----

	/**
	 * Check if a specific unit is in the timetable
	 */
	function hasUnit(unitId: number): boolean {
		return entries.value.has(unitId)
	}

	/**
	 * Add a unit to the timetable
	 */
	function addUnit(course: Course, unit: CourseUnit<Course, CourseUnitSlot<Course, CourseUnit>>): void {
		if (!entries.value.has(unit.id)) {
			entries.value.set(unit.id, {
				course,
				unit,
				addedAt: new Date(),
			})
		}
	}

	/**
	 * Remove a unit from the timetable
	 */
	function removeUnit(unitId: number): void {
		entries.value.delete(unitId)
	}

	/**
	 * Toggle a unit in the timetable
	 */
	function toggleUnit(course: Course, unit: CourseUnit<Course, CourseUnitSlot<Course, CourseUnit>>): void {
		if (hasUnit(unit.id)) {
			removeUnit(unit.id)
		} else {
			addUnit(course, unit)
		}
	}

	/**
	 * Remove all units for a specific course
	 */
	function removeCourse(courseId: number): void {
		for (const [unitId, entry] of entries.value.entries()) {
			if (entry.course.id === courseId) {
				entries.value.delete(unitId)
			}
		}
	}

	/**
	 * Clear all entries from the timetable
	 */
	function clearAll(): void {
		entries.value.clear()
	}

	return {
		// State
		entries,

		// Computed
		allEntries,
		allSlots,
		totalCredits,
		isEmpty,
		uniqueCourses,

		// Actions
		hasUnit,
		addUnit,
		removeUnit,
		toggleUnit,
		removeCourse,
		clearAll,
	}
})
