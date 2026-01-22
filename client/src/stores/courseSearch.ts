import api from '@client/api'
import type { Course, CoursesFacets, CoursesFilter, CoursesResponse, InSISDay, InSISStudyPlanCourseGroup } from '@client/types/courses'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useStudentContext } from './studentContext'

export const useCourseSearch = defineStore('courseSearch', () => {
	const studentContext = useStudentContext()
	const { selectedStudyPlanId } = storeToRefs(studentContext)

	// ---- Filter State ----
	const filter = ref<CoursesFilter>({
		limit: 50,
		offset: 0,
	})

	// ---- Results State ----
	const courses = ref<Course[]>([])
	const facets = ref<CoursesFacets | null>(null)
	const meta = ref<{ limit: number; offset: number; count: number; total: number } | null>(null)
	const isLoading = ref(false)
	const error = ref<string | null>(null)

	// ---- Timetable Selection State ----
	const timetableSelection = ref<{
		day: InSISDay | null
		timeFrom: number | null
		timeTo: number | null
	}>({
		day: null,
		timeFrom: null,
		timeTo: null,
	})

	// ---- Computed ----
	const hasResults = computed(() => courses.value.length > 0)
	const totalResults = computed(() => meta.value?.total ?? 0)
	const currentPage = computed(() => Math.floor((filter.value.offset ?? 0) / (filter.value.limit ?? 50)) + 1)
	const totalPages = computed(() => Math.ceil(totalResults.value / (filter.value.limit ?? 50)))
	const hasActiveFilters = computed(() => {
		const f = filter.value
		return !!(
			f.ident ||
			f.search ||
			f.day ||
			f.time_from ||
			f.time_to ||
			f.lecturer ||
			f.language ||
			f.level ||
			f.ects ||
			f.mode_of_completion ||
			f.group ||
			f.category ||
			(f.faculty_id && !selectedStudyPlanId.value)
		)
	})

	// ---- Watchers ----
	// Auto-update study_plan_id when student context changes
	watch(selectedStudyPlanId, (newId) => {
		if (newId !== null) {
			filter.value.study_plan_id = newId
		} else {
			delete filter.value.study_plan_id
		}
	})

	// ---- Actions ----

	/**
	 * Search courses with current filter
	 */
	async function search(): Promise<void> {
		isLoading.value = true
		error.value = null

		try {
			// Build the filter payload, removing empty values
			const payload = buildFilterPayload()

			const response = await api.post<CoursesResponse>('/courses', payload)

			courses.value = response.data.data
			facets.value = response.data.facets
			meta.value = response.data.meta
		} catch (err) {
			error.value = 'Nepodařilo se vyhledat předměty.'
			console.error('Failed to search courses:', err)
		} finally {
			isLoading.value = false
		}
	}

	/**
	 * Build clean filter payload
	 */
	function buildFilterPayload(): CoursesFilter {
		const payload: CoursesFilter = {
			limit: filter.value.limit ?? 50,
			offset: filter.value.offset ?? 0,
		}

		// Add study plan if selected
		if (selectedStudyPlanId.value) {
			payload.study_plan_id = selectedStudyPlanId.value
		}

		// Add other filters if present
		if (filter.value.ident) payload.ident = filter.value.ident
		if (filter.value.search) payload.search = filter.value.search
		if (filter.value.semester) payload.semester = filter.value.semester
		if (filter.value.year) payload.year = filter.value.year
		if (filter.value.faculty_id) payload.faculty_id = filter.value.faculty_id
		if (filter.value.day) payload.day = filter.value.day
		if (filter.value.time_from !== undefined) payload.time_from = filter.value.time_from
		if (filter.value.time_to !== undefined) payload.time_to = filter.value.time_to
		if (filter.value.group?.length) payload.group = filter.value.group
		if (filter.value.category?.length) payload.category = filter.value.category
		if (filter.value.lecturer) payload.lecturer = filter.value.lecturer
		if (filter.value.language) payload.language = filter.value.language
		if (filter.value.level) payload.level = filter.value.level
		if (filter.value.ects) payload.ects = filter.value.ects
		if (filter.value.mode_of_completion) payload.mode_of_completion = filter.value.mode_of_completion

		return payload
	}

	/**
	 * Update a single filter value and trigger search
	 */
	function setFilter<K extends keyof CoursesFilter>(key: K, value: CoursesFilter[K]): void {
		filter.value[key] = value
		filter.value.offset = 0 // Reset pagination on filter change
	}

	/**
	 * Clear a specific filter
	 */
	function clearFilter(key: keyof CoursesFilter): void {
		delete filter.value[key]
		filter.value.offset = 0
	}

	/**
	 * Clear all filters except study_plan_id
	 */
	function clearAllFilters(): void {
		const studyPlanId = filter.value.study_plan_id
		filter.value = {
			limit: 50,
			offset: 0,
		}
		if (studyPlanId) {
			filter.value.study_plan_id = studyPlanId
		}
	}

	/**
	 * Set day filter(s)
	 */
	function setDayFilter(days: InSISDay | InSISDay[] | null): void {
		if (days === null) {
			delete filter.value.day
		} else {
			filter.value.day = days
		}
		filter.value.offset = 0
	}

	/**
	 * Toggle a specific day in the filter
	 */
	function toggleDay(day: InSISDay): void {
		const currentDays = Array.isArray(filter.value.day) ? filter.value.day : filter.value.day ? [filter.value.day] : []

		if (currentDays.includes(day)) {
			const newDays = currentDays.filter((d) => d !== day)
			filter.value.day = newDays.length > 0 ? newDays : undefined
		} else {
			filter.value.day = [...currentDays, day]
		}
		filter.value.offset = 0
	}

	/**
	 * Set time range filter (from timetable selection)
	 */
	function setTimeFilter(timeFrom: number | null, timeTo: number | null): void {
		if (timeFrom !== null) {
			filter.value.time_from = timeFrom
		} else {
			delete filter.value.time_from
		}

		if (timeTo !== null) {
			filter.value.time_to = timeTo
		} else {
			delete filter.value.time_to
		}
		filter.value.offset = 0
	}

	/**
	 * Set group filter (compulsory, elective, optional)
	 */
	function setGroupFilter(groups: InSISStudyPlanCourseGroup[]): void {
		if (groups.length > 0) {
			filter.value.group = groups
		} else {
			delete filter.value.group
		}
		filter.value.offset = 0
	}

	/**
	 * Apply timetable selection to filter
	 */
	function applyTimetableSelection(): void {
		if (timetableSelection.value.day) {
			setDayFilter(timetableSelection.value.day)
		}
		setTimeFilter(timetableSelection.value.timeFrom, timetableSelection.value.timeTo)
	}

	/**
	 * Clear timetable selection
	 */
	function clearTimetableSelection(): void {
		timetableSelection.value = {
			day: null,
			timeFrom: null,
			timeTo: null,
		}
	}

	/**
	 * Go to specific page
	 */
	function goToPage(page: number): void {
		const limit = filter.value.limit ?? 50
		filter.value.offset = (page - 1) * limit
	}

	/**
	 * Reset the store
	 */
	function reset(): void {
		filter.value = {
			limit: 50,
			offset: 0,
		}
		courses.value = []
		facets.value = null
		meta.value = null
		error.value = null
		clearTimetableSelection()
	}

	return {
		// State
		filter,
		courses,
		facets,
		meta,
		isLoading,
		error,
		timetableSelection,

		// Computed
		hasResults,
		totalResults,
		currentPage,
		totalPages,
		hasActiveFilters,

		// Actions
		search,
		setFilter,
		clearFilter,
		clearAllFilters,
		setDayFilter,
		toggleDay,
		setTimeFilter,
		setGroupFilter,
		applyTimetableSelection,
		clearTimetableSelection,
		goToPage,
		reset,
	}
})
