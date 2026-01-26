import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse.ts'
import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem.ts'
import InSISService from '@api/Services/InSISService.ts'
import { TimeSelection } from '@api/Validations'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import api from '@client/api'
import { useWizardStore } from '@client/stores/wizard'
import { CourseSortBy, PaginationMeta, SortDirection } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
import InSISStudyPlanCourseCategory from '@scraper/Types/InSISStudyPlanCourseCategory.ts'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup.ts'

type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

interface CourseFacets {
	faculties: FacetItem[]
	days: FacetItem[]
	lecturers: FacetItem[]
	languages: FacetItem[]
	levels: FacetItem[]
	semesters: FacetItem[]
	years: FacetItem[]
	groups: FacetItem[]
	categories: FacetItem[]
	ects: FacetItem[]
	modes_of_completion: FacetItem[]
	time_range: { min_time: number; max_time: number }
}

/** Default filter state */
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
		exclude_slot_ids: [],
		sort_by: 'ident',
		sort_dir: 'asc',
		limit: 50,
		offset: 0,
	}
}

/**
 * Courses Store
 * Manages course search, filtering, and pagination.
 * Syncs with the timetable store for selected courses.
 */
export const useCoursesStore = defineStore('courses', () => {
	const wizardStore = useWizardStore()

	// =========================================================================
	// STATE
	// =========================================================================

	/** Current filter state */
	const filters = ref<CoursesFilter>(createDefaultFilters())

	/** Course data from API */
	const courses = ref<CourseWithRelations[]>([])

	/** Facet data from API */
	const facets = ref<CourseFacets>({
		faculties: [],
		days: [],
		lecturers: [],
		languages: [],
		levels: [],
		semesters: [],
		years: [],
		groups: [],
		categories: [],
		ects: [],
		modes_of_completion: [],
		time_range: { min_time: 420, max_time: 1200 }, // 7:00 - 20:00 default
	})

	/** Pagination metadata */
	const pagination = ref<PaginationMeta>({
		limit: 50,
		offset: 0,
		count: 0,
		total: 0,
	})

	/** Loading state */
	const loading = ref(false)

	/** Error state */
	const error = ref<string | null>(null)

	/** Expanded row IDs (for course detail view) */
	const expandedCourseIds = ref<Set<number>>(new Set())

	// =========================================================================
	// COMPUTED
	// =========================================================================

	/** Total pages available */
	const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.limit))

	/** Current page (1-indexed) */
	const currentPage = computed(() => Math.floor(pagination.value.offset / pagination.value.limit) + 1)

	/** Whether there are more pages */
	const hasNextPage = computed(() => currentPage.value < totalPages.value)

	/** Whether there's a previous page */
	const hasPrevPage = computed(() => currentPage.value > 1)

	/** Active filter count (for UI indicators) */
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

		return count
	})

	/** Whether any filters are active */
	const hasActiveFilters = computed(() => activeFilterCount.value > 0)

	// =========================================================================
	// ACTIONS
	// =========================================================================

	/** Initialize filters from wizard selection */
	function initializeFromWizard() {
		if (wizardStore.studyPlanId) {
			filters.value.study_plan_ids = [wizardStore.studyPlanId]
		}

		// Set year and semester based on current date
		const upcomingPeriod = InSISService.getUpcomingPeriod(new Date())

		if (!upcomingPeriod) return
		filters.value.years = [upcomingPeriod.year]
		filters.value.semesters = [upcomingPeriod.semester]
	}

	/** Fetch courses from API */
	async function fetchCourses() {
		loading.value = true
		error.value = null

		try {
			// Build request payload
			const payload: Partial<CoursesFilter> = {
				...filters.value,
				// Only include non-empty arrays
				ids: filters.value.ids?.length ? filters.value.ids : undefined,
				idents: filters.value.idents?.length ? filters.value.idents : undefined,
				title: filters.value.title || undefined,
				semesters: filters.value.semesters?.length ? filters.value.semesters : undefined,
				years: filters.value.years?.length ? filters.value.years : undefined,
				faculty_ids: filters.value.faculty_ids?.length ? filters.value.faculty_ids : undefined,
				levels: filters.value.levels?.length ? filters.value.levels : undefined,
				languages: filters.value.languages?.length ? filters.value.languages : undefined,
				include_times: filters.value.include_times?.length ? filters.value.include_times : undefined,
				exclude_times: filters.value.exclude_times?.length ? filters.value.exclude_times : undefined,
				lecturers: filters.value.lecturers?.length ? filters.value.lecturers : undefined,
				study_plan_ids: filters.value.study_plan_ids?.length ? filters.value.study_plan_ids : undefined,
				groups: filters.value.groups?.length ? filters.value.groups : undefined,
				categories: filters.value.categories?.length ? filters.value.categories : undefined,
				ects: filters.value.ects?.length ? filters.value.ects : undefined,
				mode_of_completions: filters.value.mode_of_completions?.length ? filters.value.mode_of_completions : undefined,
				mode_of_deliveries: filters.value.mode_of_deliveries?.length ? filters.value.mode_of_deliveries : undefined,
				exclude_slot_ids: filters.value.exclude_slot_ids?.length ? filters.value.exclude_slot_ids : undefined,
			}

			const response = await api.post<CoursesResponse>('/courses', payload)

			courses.value = response.data.data
			facets.value = response.data.facets
			pagination.value = response.data.meta
		} catch (e) {
			error.value = 'Failed to load courses'
			console.error('Courses: Failed to fetch', e)
		} finally {
			loading.value = false
		}
	}

	// -------------------------------------------------------------------------
	// FILTER SETTERS
	// -------------------------------------------------------------------------

	/** Set text search filter */
	function setTitleSearch(title: string) {
		filters.value.title = title
		filters.value.offset = 0 // Reset pagination
	}

	/** Set faculty filter */
	function setFacultyIds(ids: string[]) {
		filters.value.faculty_ids = ids
		filters.value.offset = 0
	}

	/** Set level filter */
	function setLevels(levels: string[]) {
		filters.value.levels = levels
		filters.value.offset = 0
	}

	/** Set language filter */
	function setLanguages(languages: string[]) {
		filters.value.languages = languages
		filters.value.offset = 0
	}

	/** Set lecturer filter */
	function setLecturers(lecturers: string[]) {
		filters.value.lecturers = lecturers
		filters.value.offset = 0
	}

	/** Set study plan groups filter */
	function setGroups(groups: InSISStudyPlanCourseGroup[]) {
		filters.value.groups = groups
		filters.value.offset = 0
	}

	/** Set study plan categories filter */
	function setCategories(categories: InSISStudyPlanCourseCategory[]) {
		filters.value.categories = categories
		filters.value.offset = 0
	}

	/** Set ECTS filter */
	function setEcts(ects: number[]) {
		filters.value.ects = ects
		filters.value.offset = 0
	}

	/** Set mode of completion filter */
	function setModesOfCompletion(modes: string[]) {
		filters.value.mode_of_completions = modes
		filters.value.offset = 0
	}

	/** Add a time inclusion filter */
	function addIncludeTime(timeSelection: TimeSelection) {
		if (!filters.value.include_times) filters.value.include_times = []
		filters.value.include_times.push(timeSelection)
		filters.value.offset = 0
	}

	/** Remove a time inclusion filter */
	function removeIncludeTime(index: number) {
		if (!filters.value.include_times) return
		filters.value.include_times.splice(index, 1)
		filters.value.offset = 0
	}

	/** Clear all time inclusion filters */
	function clearIncludeTimes() {
		filters.value.include_times = []
		filters.value.offset = 0
	}

	/** Add a time exclusion filter */
	function addExcludeTime(timeSelection: TimeSelection) {
		if (!filters.value.exclude_times) filters.value.exclude_times = []
		filters.value.exclude_times.push(timeSelection)
		filters.value.offset = 0
	}

	/** Remove a time exclusion filter */
	function removeExcludeTime(index: number) {
		if (!filters.value.exclude_times) return
		filters.value.exclude_times.splice(index, 1)
		filters.value.offset = 0
	}

	/** Clear all time exclusion filters */
	function clearExcludeTimes() {
		filters.value.exclude_times = []
		filters.value.offset = 0
	}

	/**
	 * Set time filter from timetable drag selection
	 * This is used by the drag-to-filter feature
	 */
	function setTimeFilterFromDrag(day: InSISDay, timeFrom: number, timeTo: number) {
		// Clear existing include times and set the new one
		filters.value.include_times = [
			{
				day,
				time_from: timeFrom,
				time_to: timeTo,
			},
		]
		filters.value.offset = 0
	}

	/** Set excluded slot IDs (courses already in timetable) */
	function setExcludeSlotIds(slotIds: number[]) {
		filters.value.exclude_slot_ids = slotIds
	}

	// -------------------------------------------------------------------------
	// SORTING
	// -------------------------------------------------------------------------

	/** Set sort field */
	function setSortBy(sortBy: CourseSortBy) {
		filters.value.sort_by = sortBy
	}

	/** Set sort direction */
	function setSortDir(direction: SortDirection) {
		filters.value.sort_dir = direction
	}

	/** Toggle sort direction */
	function toggleSortDir() {
		filters.value.sort_dir = filters.value.sort_dir === 'asc' ? 'desc' : 'asc'
	}

	// -------------------------------------------------------------------------
	// PAGINATION
	// -------------------------------------------------------------------------

	/** Go to specific page (1-indexed) */
	function goToPage(page: number) {
		if (page < 1 || page > totalPages.value) return
		filters.value.offset = (page - 1) * filters.value.limit
	}

	/** Go to next page */
	function nextPage() {
		if (hasNextPage.value) {
			goToPage(currentPage.value + 1)
		}
	}

	/** Go to previous page */
	function prevPage() {
		if (hasPrevPage.value) {
			goToPage(currentPage.value - 1)
		}
	}

	/** Set page size */
	function setPageSize(size: number) {
		filters.value.limit = size
		filters.value.offset = 0
	}

	// -------------------------------------------------------------------------
	// ROW EXPANSION
	// -------------------------------------------------------------------------

	/** Toggle row expansion for a course */
	function toggleCourseExpansion(courseId: number) {
		if (expandedCourseIds.value.has(courseId)) {
			expandedCourseIds.value.delete(courseId)
		} else {
			expandedCourseIds.value.add(courseId)
		}
	}

	/** Check if a course row is expanded */
	function isCourseExpanded(courseId: number): boolean {
		return expandedCourseIds.value.has(courseId)
	}

	/** Collapse all expanded rows */
	function collapseAllCourses() {
		expandedCourseIds.value.clear()
	}

	// -------------------------------------------------------------------------
	// RESET
	// -------------------------------------------------------------------------

	/** Reset all filters to defaults (keeps wizard-derived filters) */
	function resetFilters() {
		const defaults = createDefaultFilters()

		// Preserve wizard-derived filters
		if (wizardStore.studyPlanId) {
			defaults.study_plan_ids = [wizardStore.studyPlanId]
		}

		// Set year and semester based on current date
		const upcomingPeriod = InSISService.getUpcomingPeriod(new Date())

		if (!upcomingPeriod) return
		defaults.years = [upcomingPeriod.year]
		defaults.semesters = [upcomingPeriod.semester]

		filters.value = defaults
	}

	/** Reset everything including wizard filters */
	function resetAll() {
		filters.value = createDefaultFilters()
		courses.value = []
		expandedCourseIds.value.clear()
	}

	// =========================================================================
	// WATCHERS
	// =========================================================================

	// Auto-fetch when filters change (debounced in component)
	// Note: Components should call fetchCourses() explicitly after filter changes

	// =========================================================================
	// RETURN
	// =========================================================================

	return {
		// State
		filters,
		courses,
		facets,
		pagination,
		loading,
		error,
		expandedCourseIds,

		// Computed
		totalPages,
		currentPage,
		hasNextPage,
		hasPrevPage,
		activeFilterCount,
		hasActiveFilters,

		// Actions
		initializeFromWizard,
		fetchCourses,

		// Filter setters
		setTitleSearch,
		setFacultyIds,
		setLevels,
		setLanguages,
		setLecturers,
		setGroups,
		setCategories,
		setEcts,
		setModesOfCompletion,
		addIncludeTime,
		removeIncludeTime,
		clearIncludeTimes,
		addExcludeTime,
		removeExcludeTime,
		clearExcludeTimes,
		setTimeFilterFromDrag,
		setExcludeSlotIds,

		// Sorting
		setSortBy,
		setSortDir,
		toggleSortDir,

		// Pagination
		goToPage,
		nextPage,
		prevPage,
		setPageSize,

		// Row expansion
		toggleCourseExpansion,
		isCourseExpanded,
		collapseAllCourses,

		// Reset
		resetFilters,
		resetAll,
	}
})
