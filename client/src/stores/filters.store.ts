import InSISService from '@api/Services/InSISService.ts'
import type { TimeSelection } from '@api/Validations'
import type { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

function createDefaultFilters(): CoursesFilter {
	return {
		ids: [],
		idents: [],
		title: '',
		semesters: [],
		years: [],
		faculty_ids: [],
		levels: [],
		languages: [],
		include_times: [],
		exclude_times: [],
		lecturers: [],
		study_plan_ids: [],
		groups: [],
		categories: [],
		ects: [],
		mode_of_completions: [],
		mode_of_deliveries: [],
		completed_course_idents: [],
		sort_by: 'ident',
		sort_dir: 'asc',
		limit: 50,
		offset: 0,
	}
}

export const useFiltersStore = defineStore('filters', () => {
	const filters = ref<CoursesFilter>(createDefaultFilters())
	const hideConflictingCourses = ref(false)
	const timetableExcludeTimes = ref<TimeSelection[]>([])

	const mergedExcludeTimes = computed<TimeSelection[]>(() => {
		const manual = filters.value.exclude_times ?? []
		const timetable = hideConflictingCourses.value ? timetableExcludeTimes.value : []
		return [...manual, ...timetable]
	})

	const activeFilterCount = computed(() => {
		const f = filters.value
		let count = 0
		if (f.title) count++
		if (f.faculty_ids?.length) count++
		if (f.levels?.length) count++
		if (f.languages?.length) count++
		if (f.lecturers?.length) count++
		if (f.groups?.length) count++
		if (f.categories?.length) count++
		if (f.ects?.length) count++
		if (f.mode_of_completions?.length) count++
		if (f.include_times?.length) count++
		if (f.exclude_times?.length) count++
		if (hideConflictingCourses.value) count++
		return count
	})

	const hasActiveFilters = computed(() => activeFilterCount.value > 0)

	function setFilter<K extends keyof CoursesFilter>(key: K, value: CoursesFilter[K]) {
		filters.value[key] = value
		filters.value.offset = 0
	}

	function addIncludeTime(timeSelection: TimeSelection) {
		if (!filters.value.include_times) filters.value.include_times = []
		filters.value.include_times.push(timeSelection)
		filters.value.offset = 0
	}

	function removeIncludeTime(index: number) {
		filters.value.include_times?.splice(index, 1)
		filters.value.offset = 0
	}

	function clearIncludeTimes() {
		filters.value.include_times = []
		filters.value.offset = 0
	}

	function addExcludeTime(timeSelection: TimeSelection) {
		if (!filters.value.exclude_times) filters.value.exclude_times = []
		filters.value.exclude_times.push(timeSelection)
		filters.value.offset = 0
	}

	function removeExcludeTime(index: number) {
		filters.value.exclude_times?.splice(index, 1)
		filters.value.offset = 0
	}

	function clearExcludeTimes() {
		filters.value.exclude_times = []
		filters.value.offset = 0
	}

	function initializeFromWizard(studyPlanIds: number[], completedIdents: string[]) {
		if (studyPlanIds.length > 0) {
			filters.value.study_plan_ids = [...studyPlanIds]
		}
		if (completedIdents.length > 0) {
			filters.value.completed_course_idents = [...completedIdents]
		}
		const period = InSISService.getUpcomingPeriod()
		filters.value.years = [period.year]
		filters.value.semesters = [period.semester]
	}

	function syncTimetableExcludeTimes(times: TimeSelection[]) {
		timetableExcludeTimes.value = [...times]
	}

	function toggleHideConflicting(timetableTimes: TimeSelection[]) {
		hideConflictingCourses.value = !hideConflictingCourses.value
		timetableExcludeTimes.value = hideConflictingCourses.value ? [...timetableTimes] : []
		filters.value.offset = 0
	}

	function resetFilters(studyPlanIds: number[], completedIdents: string[]) {
		filters.value = createDefaultFilters()
		const period = InSISService.getUpcomingPeriod()
		filters.value.years = [period.year]
		filters.value.semesters = [period.semester]
		if (studyPlanIds.length > 0) filters.value.study_plan_ids = [...studyPlanIds]
		if (completedIdents.length > 0) filters.value.completed_course_idents = [...completedIdents]
		hideConflictingCourses.value = false
		timetableExcludeTimes.value = []
	}

	function resetAll() {
		filters.value = createDefaultFilters()
		hideConflictingCourses.value = false
		timetableExcludeTimes.value = []
	}

	return {
		filters,
		hideConflictingCourses,
		timetableExcludeTimes,
		mergedExcludeTimes,
		activeFilterCount,
		hasActiveFilters,
		setFilter,
		addIncludeTime,
		removeIncludeTime,
		clearIncludeTimes,
		addExcludeTime,
		removeExcludeTime,
		clearExcludeTimes,
		initializeFromWizard,
		syncTimetableExcludeTimes,
		toggleHideConflicting,
		resetFilters,
		resetAll,
	}
})
