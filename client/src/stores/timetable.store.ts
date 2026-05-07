import type { CourseUnit, CourseUnitSlot, CourseWithRelations } from '@api/Database/types'
import type { TimeSelection } from '@api/Validations'
import { STORAGE_KEYS } from '@client/constants/storage.ts'
import { ALL_DAYS } from '@client/constants/timetable'
import { i18n } from '@client/index'
import { useAnnouncerStore } from '@client/stores/announcer.store'
import { useFiltersStore } from '@client/stores/filters.store'
import type { CourseStatus, CourseUnitType, PersistedTimetableState, SelectedCourseUnit, SlotConflictInfo } from '@client/types'
import { getSlotType } from '@client/utils/course'
import { getDayFromDate } from '@client/utils/day'
import { loadFromStorage, removeFromStorage, saveToStorage } from '@client/utils/localstorage.ts'
import { checkCourseCompleteness, unitsCampusConflict, unitsConflict } from '@client/utils/timetable'
import type InSISDay from '@scraper/Types/InSISDay'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

/**
 * Timetable Store
 *
 * Manages selected course units, conflict detection, and persistence.
 * Drag selection state lives in drag.store.ts.
 *
 * No longer imports useCoursesStore — completeness data is snapshotted
 * into SelectedCourseUnit.snapshotAvailableTypes at add-time.
 */
export const useTimetableStore = defineStore('timetable', () => {
	const announcer = useAnnouncerStore()
	const selectedUnits = ref<SelectedCourseUnit[]>([])

	// ── Computed ──────────────────────────────────────────────────────────

	const selectedCourseIds = computed(() => [...new Set(selectedUnits.value.map((u) => u.courseId))])

	const selectedSlotIds = computed(() => selectedUnits.value.map((u) => u.slotId))

	const unitsByCourse = computed(() => {
		const map = new Map<number, SelectedCourseUnit[]>()
		for (const unit of selectedUnits.value) {
			const existing = map.get(unit.courseId) ?? []
			existing.push(unit)
			map.set(unit.courseId, existing)
		}
		return map
	})

	const unitsByDay = computed(() => {
		const map = new Map<InSISDay, SelectedCourseUnit[]>()
		for (const day of ALL_DAYS) map.set(day, [])
		for (const unit of selectedUnits.value) {
			const day = unit.date ? getDayFromDate(unit.date) : unit.day
			if (day) map.get(day)?.push(unit)
		}
		return map
	})

	const totalEcts = computed(() => {
		const seen = new Set<number>()
		let total = 0
		for (const unit of selectedUnits.value) {
			if (!seen.has(unit.courseId) && unit.ects) {
				total += unit.ects
				seen.add(unit.courseId)
			}
		}
		return total
	})

	const selectedTimesForExclusion = computed<TimeSelection[]>(() => {
		const entries: TimeSelection[] = []
		const seenDayTimes = new Set<string>()

		for (const u of selectedUnits.value) {
			if (u.timeFrom == null || u.timeTo == null) continue

			if (u.day) {
				const key = `d:${u.day}:${u.timeFrom}:${u.timeTo}`
				if (!seenDayTimes.has(key)) {
					seenDayTimes.add(key)
					entries.push({ slot_id: u.slotId, day: u.day, time_from: u.timeFrom, time_to: u.timeTo } as TimeSelection)
				}
			}

			if (u.date) {
				entries.push({ slot_id: u.slotId, date: new Date(u.date), time_from: u.timeFrom, time_to: u.timeTo } as TimeSelection)
				const dayFromDate = getDayFromDate(u.date)
				if (dayFromDate) {
					const key = `d:${dayFromDate}:${u.timeFrom}:${u.timeTo}`
					if (!seenDayTimes.has(key)) {
						seenDayTimes.add(key)
						entries.push({ slot_id: u.slotId, day: dayFromDate, time_from: u.timeFrom, time_to: u.timeTo } as TimeSelection)
					}
				}
			}
		}

		return entries
	})

	const conflicts = computed<Array<[SelectedCourseUnit, SelectedCourseUnit]>>(() => {
		const pairs: Array<[SelectedCourseUnit, SelectedCourseUnit]> = []
		for (let i = 0; i < selectedUnits.value.length; i++) {
			for (let j = i + 1; j < selectedUnits.value.length; j++) {
				const a = selectedUnits.value[i]
				const b = selectedUnits.value[j]
				if (!a || !b) continue
				if (unitsConflict(a, b)) pairs.push([a, b])
			}
		}
		return pairs
	})

	/** Campus travel-time conflict pairs (no hard overlap, but too close across campuses). */
	const campusConflicts = computed<Array<[SelectedCourseUnit, SelectedCourseUnit]>>(() => {
		const pairs: Array<[SelectedCourseUnit, SelectedCourseUnit]> = []
		for (let i = 0; i < selectedUnits.value.length; i++) {
			for (let j = i + 1; j < selectedUnits.value.length; j++) {
				const a = selectedUnits.value[i]
				const b = selectedUnits.value[j]
				if (!a || !b) continue
				if (unitsCampusConflict(a, b)) pairs.push([a, b])
			}
		}
		return pairs
	})

	const hasConflicts = computed(() => conflicts.value.length > 0)

	const hasCampusConflicts = computed(() => campusConflicts.value.length > 0)

	const coursesWithConflicts = computed(() => {
		const map = new Map<number, Set<string>>()
		for (const [a, b] of conflicts.value) {
			if (!map.has(a.courseId)) map.set(a.courseId, new Set())
			map.get(a.courseId)!.add(b.courseIdent)
			if (!map.has(b.courseId)) map.set(b.courseId, new Set())
			map.get(b.courseId)!.add(a.courseIdent)
		}
		return map
	})

	const coursesWithCampusConflicts = computed(() => {
		const map = new Map<number, Set<string>>()
		for (const [a, b] of campusConflicts.value) {
			if (!map.has(a.courseId)) map.set(a.courseId, new Set())
			map.get(a.courseId)!.add(b.courseIdent)
			if (!map.has(b.courseId)) map.set(b.courseId, new Set())
			map.get(b.courseId)!.add(a.courseIdent)
		}
		return map
	})

	const courseStatuses = computed<Map<number, CourseStatus>>(() => {
		const statuses = new Map<number, CourseStatus>()

		for (const courseId of selectedCourseIds.value) {
			const units = unitsByCourse.value.get(courseId) ?? []
			if (units.length === 0) continue

			const firstUnit = units[0]!
			const conflictsWith = coursesWithConflicts.value.get(courseId)
			const campusConflictsWith = coursesWithCampusConflicts.value.get(courseId)
			const hasConflict = !!conflictsWith?.size
			const hasCampusConflict = !!campusConflictsWith?.size

			// Use snapshotted available types — no need to look up full course
			const { isIncomplete, missingTypes } = checkCourseCompleteness(units, getSlotType)

			// Priority: hard conflict > campus-conflict > incomplete > selected
			const status = hasConflict ? 'conflict' : hasCampusConflict ? 'campus-conflict' : isIncomplete ? 'incomplete' : 'selected'

			statuses.set(courseId, {
				id: courseId,
				ident: firstUnit.courseIdent,
				title: firstUnit.courseTitle,
				titleCs: firstUnit.courseTitleCs,
				titleEn: firstUnit.courseTitleEn,
				status,
				conflictsWith: conflictsWith ? [...conflictsWith] : [],
				campusConflictsWith: campusConflictsWith ? [...campusConflictsWith] : [],
				missingTypes,
			})
		}

		return statuses
	})

	const coursesWithIssuesCount = computed(() => {
		let count = 0
		for (const s of courseStatuses.value.values()) {
			if (s.status !== 'selected') count++
		}
		return count
	})

	// ── Actions ──────────────────────────────────────────────────────────

	function getSlotConflicts(slot: CourseUnitSlot): SelectedCourseUnit[] {
		if (!slot.time_from || !slot.time_to) return []
		const slotDay = slot.day ?? (slot.date ? getDayFromDate(slot.date) : null)
		if (!slotDay) return []

		return selectedUnits.value.filter((unit) => {
			if (unit.slotId === slot.id) return false
			const unitDay = unit.day ?? (unit.date ? getDayFromDate(unit.date) : null)
			if (!unitDay || unitDay !== slotDay) return false
			if (slot.date && unit.date && slot.date !== unit.date) return false
			return slot.time_from! < unit.timeTo && unit.timeFrom < slot.time_to!
		})
	}

	function getSlotCampusConflicts(slot: CourseUnitSlot): SelectedCourseUnit[] {
		if (!slot.time_from || !slot.time_to) return []
		const slotDay = slot.day ?? (slot.date ? getDayFromDate(slot.date) : null)
		if (!slotDay) return []

		// Build a pseudo-SelectedCourseUnit for the slot so we can use unitsCampusConflict
		const slotAsUnit: SelectedCourseUnit = {
			courseId: -1,
			courseIdent: '',
			courseTitle: '',
			courseTitleCs: '',
			courseTitleEn: '',
			unitId: -1,
			unitType: 'lecture',
			slotId: slot.id,
			day: slot.day ?? undefined,
			date: slot.date ?? undefined,
			timeFrom: slot.time_from!,
			timeTo: slot.time_to!,
			location: slot.location ?? undefined,
		}

		return selectedUnits.value.filter((unit) => {
			if (unit.slotId === slot.id) return false
			return unitsCampusConflict(slotAsUnit, unit)
		})
	}

	function getUnitConflicts(unit: CourseUnit<void, CourseUnitSlot>): SlotConflictInfo[] {
		const result: SlotConflictInfo[] = []
		for (const slot of unit.slots ?? []) {
			const slotConflicts = getSlotConflicts(slot as CourseUnitSlot)
			if (slotConflicts.length > 0) result.push({ slotId: (slot as CourseUnitSlot).id, conflictingUnits: slotConflicts, conflictType: 'hard' })
		}
		return result
	}

	function getUnitCampusConflicts(unit: CourseUnit<void, CourseUnitSlot>): SlotConflictInfo[] {
		const result: SlotConflictInfo[] = []
		for (const slot of unit.slots ?? []) {
			const slotConflicts = getSlotCampusConflicts(slot as CourseUnitSlot)
			if (slotConflicts.length > 0) result.push({ slotId: (slot as CourseUnitSlot).id, conflictingUnits: slotConflicts, conflictType: 'campus' })
		}
		return result
	}

	function unitHasConflicts(unit: CourseUnit<void, CourseUnitSlot>): boolean {
		return (unit.slots ?? []).some((slot: CourseUnitSlot) => getSlotConflicts(slot).length > 0)
	}

	function unitHasCampusConflicts(unit: CourseUnit<void, CourseUnitSlot>): boolean {
		return (unit.slots ?? []).some((slot: CourseUnitSlot) => getSlotCampusConflicts(slot).length > 0)
	}

	function canAddUnit(course: CourseWithRelations, _unit: CourseUnit<void, CourseUnitSlot>, slot: CourseUnitSlot): string | null {
		if (selectedUnits.value.some((u) => u.slotId === slot.id)) {
			return t('stores.timetable.errors.slotAlreadySelected')
		}
		return null
	}

	function addUnit(course: CourseWithRelations, unit: CourseUnit<void, CourseUnitSlot>, slot: CourseUnitSlot): boolean {
		if (canAddUnit(course, unit, slot)) return false

		// Snapshot available unit types from the full course so we never need
		// to call useCoursesStore() in a computed.
		const snapshotAvailableTypes: CourseUnitType[] = []
		for (const u of course.units ?? []) {
			for (const s of u.slots ?? []) {
				const type = getSlotType(s as CourseUnitSlot)
				if (!snapshotAvailableTypes.includes(type)) snapshotAvailableTypes.push(type)
			}
		}

		selectedUnits.value.push({
			courseId: course.id,
			courseIdent: course.ident,
			courseTitle: course.title ?? course.title_en ?? course.title_cs ?? '',
			courseTitleCs: course.title_cs ?? course.title ?? '',
			courseTitleEn: course.title_en ?? course.title ?? '',
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
			snapshotAvailableTypes,
		})

		announcer.announce(t('common.announcements.courseAdded', { code: course.ident }))
		persist()
		syncCoursesStoreExclusion()
		return true
	}

	function removeUnit(unitId: number) {
		const unit = selectedUnits.value.find((u) => u.unitId === unitId)
		if (unit) {
			announcer.announce(t('common.announcements.courseRemoved', { code: unit.courseIdent }))
		}

		selectedUnits.value = selectedUnits.value.filter((u) => u.unitId !== unitId)
		persist()
		syncCoursesStoreExclusion()
	}

	function removeCourse(courseId: number) {
		const units = selectedUnits.value.filter((u) => u.courseId === courseId)
		if (units.length > 0) {
			announcer.announce(t('common.announcements.courseRemoved', { code: units[0]?.courseIdent }))
		}

		selectedUnits.value = selectedUnits.value.filter((u) => u.courseId !== courseId)
		persist()
		syncCoursesStoreExclusion()
	}

	function changeUnit(course: CourseWithRelations, oldSlotId: number, newUnit: CourseUnit<void, CourseUnitSlot>, newSlot: CourseUnitSlot): boolean {
		const oldIndex = selectedUnits.value.findIndex((u) => u.slotId === oldSlotId)
		const oldUnit = oldIndex !== -1 ? selectedUnits.value[oldIndex] : null

		if (oldUnit) selectedUnits.value.splice(oldIndex, 1)

		const error = canAddUnit(course, newUnit, newSlot)
		if (error) {
			if (oldUnit) selectedUnits.value.splice(oldIndex, 0, oldUnit)
			return false
		}

		return addUnit(course, newUnit, newSlot)
	}

	function syncCoursesStoreExclusion() {
		const filtersStore = useFiltersStore()
		if (filtersStore.hideConflictingCourses) {
			filtersStore.syncTimetableExcludeTimes(selectedTimesForExclusion.value)
		}
	}

	function getUnitsForCourse(courseId: number): SelectedCourseUnit[] {
		return unitsByCourse.value.get(courseId) ?? []
	}

	function hasCourseSelected(courseId: number): boolean {
		return selectedUnits.value.some((u) => u.courseId === courseId)
	}

	function hasUnitTypeSelected(courseId: number, unitType: CourseUnitType): boolean {
		return selectedUnits.value.some((u) => u.courseId === courseId && u.unitType === unitType)
	}

	function courseHasMissingUnitTypes(courseId: number): boolean {
		return courseStatuses.value.get(courseId)?.status === 'incomplete'
	}

	function getCourseStatus(courseId: number): CourseStatus | undefined {
		return courseStatuses.value.get(courseId)
	}

	function requiredUnitTypes(units: CourseUnit<void, CourseUnitSlot>[]): Set<CourseUnitType> {
		const types = new Set<CourseUnitType>()
		for (const unit of units ?? []) {
			for (const slot of unit.slots ?? []) types.add(getSlotType(slot))
		}
		return types
	}

	function persist() {
		saveToStorage<PersistedTimetableState>(STORAGE_KEYS.TIMETABLE, { selectedUnits: selectedUnits.value })
	}

	function hydrate() {
		const state = loadFromStorage<PersistedTimetableState>(STORAGE_KEYS.TIMETABLE)
		if (state?.selectedUnits) selectedUnits.value = state.selectedUnits
	}

	function clearAll() {
		selectedUnits.value = []
		removeFromStorage(STORAGE_KEYS.TIMETABLE)
	}

	return {
		selectedUnits,
		selectedCourseIds,
		selectedSlotIds,
		unitsByCourse,
		unitsByDay,
		totalEcts,
		selectedTimesForExclusion,
		conflicts,
		campusConflicts,
		hasConflicts,
		hasCampusConflicts,
		coursesWithConflicts,
		coursesWithCampusConflicts,
		courseStatuses,
		coursesWithIssuesCount,
		// Pure helpers exported for use outside the store
		unitsConflict,
		unitsCampusConflict,
		getSlotConflicts,
		getSlotCampusConflicts,
		getUnitConflicts,
		getUnitCampusConflicts,
		unitHasConflicts,
		unitHasCampusConflicts,
		canAddUnit,
		addUnit,
		removeUnit,
		removeCourse,
		changeUnit,
		getUnitsForCourse,
		hasCourseSelected,
		hasUnitTypeSelected,
		courseHasMissingUnitTypes,
		getCourseStatus,
		requiredUnitTypes,
		persist,
		hydrate,
		clearAll,
	}
})
