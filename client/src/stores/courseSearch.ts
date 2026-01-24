import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse.ts'
import { Course } from '@api/Database/types'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import api from '@client/api'
import InSISDay from '@scraper/Types/InSISDay.ts'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup.ts'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useCourseFilters } from './courseFilters'
import { useStudentContext } from './studentContext'

export const useCourseSearch = defineStore('courseSearch', () => {
	const studentContext = useStudentContext()
	const { selectedStudyPlanId } = storeToRefs(studentContext)
	const courseFilters = useCourseFilters()

	// ---- Pagination State ----
	const limit = ref(50)
	const offset = ref(0)

	// ---- Results State ----
	const filter = ref<CoursesFilter>(courseFilters.apiFilter)
	const courses = ref<Course[]>([])
	const facets = ref<CoursesResponse['facets'] | null>(null)
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
	const currentPage = computed(() => Math.floor((offset.value ?? 0) / (limit.value ?? 50)) + 1)
	const totalPages = computed(() => Math.ceil(totalResults.value / (limit.value ?? 50)))
	const hasActiveFilters = computed(() => courseFilters.hasActiveFilters)

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
		// Get filter from courseFilters store
		const payload: CoursesFilter = {
			...courseFilters.apiFilter,
			limit: limit.value,
			offset: offset.value,
		}

		// Ensure study plan from student context is included
		if (selectedStudyPlanId.value) {
			payload.study_plan_id = selectedStudyPlanId.value
		}

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
		filter.value.limit = 50
		filter.value.offset = 0

		if (studyPlanId) {
			filter.value.study_plan_id = studyPlanId
		}
	}

	/**
	 * Set day filter(s)
	 */
	function setDayFilter(days: InSISDay | InSISDay[] | null): void {
		courseFilters.selectedDays = Array.isArray(days) ? days : days ? [days] : []
		offset.value = 0
	}

	/**
	 * Toggle a specific day in the filter
	 */
	function toggleDay(day: InSISDay): void {
		courseFilters.toggleDay(day)
		offset.value = 0
	}

	/**
	 * Set time range filter (from timetable selection)
	 */
	function setTimeFilter(timeFrom: number | null, timeTo: number | null): void {
		courseFilters.setTimeFilter(timeFrom, timeTo)
		offset.value = 0
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
		offset.value = (page - 1) * limit.value
	}

	/**
	 * Reset the store
	 */
	function reset(): void {
		limit.value = 50
		offset.value = 0
		courses.value = []
		facets.value = null
		meta.value = null
		error.value = null
		courseFilters.clearAllFilters()
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
