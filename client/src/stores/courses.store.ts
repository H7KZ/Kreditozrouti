import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse.ts'
import type { CourseWithRelations } from '@api/Database/types'
import type { TimeSelection } from '@api/Validations'
import type { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import { fetchCourses as fetchCoursesFromService } from '@client/services/courseService'
import { useFiltersStore } from '@client/stores/filters.store'
import { useTimetableStore } from '@client/stores/timetable.store'
import { useWizardStore } from '@client/stores/wizard.store'
import type { CourseSortBy, SortDirection } from '@client/types'
import type InSISDay from '@scraper/Types/InSISDay'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * Courses Store
 *
 * Manages course results, pagination, row expansion, and fetching.
 * Filter state lives in filtersStore — this store only owns result state.
 * The two sources of exclude_times (manual + timetable) are merged by filtersStore.
 */
export const useCoursesStore = defineStore('courses', () => {
	const courses = ref<CourseWithRelations[]>([])
	const facets = ref<CoursesResponse['facets']>({
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
		time_range: { min_time: 420, max_time: 1200 },
	})
	const pagination = ref({ limit: 50, offset: 0, count: 0, total: 0 })
	const loading = ref(false)
	const error = ref<string | null>(null)
	const expandedCourseIds = ref<Set<number>>(new Set())

	// Proxy filter state so components can still use coursesStore.filters.xxx
	const filters = computed(() => useFiltersStore().filters)
	const hideConflictingCourses = computed(() => useFiltersStore().hideConflictingCourses)
	const hasActiveFilters = computed(() => useFiltersStore().hasActiveFilters)
	const activeFilterCount = computed(() => useFiltersStore().activeFilterCount)

	const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.limit))
	const currentPage = computed(() => Math.floor(pagination.value.offset / pagination.value.limit) + 1)
	const hasNextPage = computed(() => currentPage.value < totalPages.value)
	const hasPrevPage = computed(() => currentPage.value > 1)

	async function fetchCourses() {
		const filtersStore = useFiltersStore()
		loading.value = true
		error.value = null

		try {
			const f = filtersStore.filters
			const mergedExclude = filtersStore.mergedExcludeTimes

			const payload: Partial<CoursesFilter> = {
				...f,
				ids: f.ids?.length ? f.ids : undefined,
				idents: f.idents?.length ? f.idents : undefined,
				title: f.title || undefined,
				semesters: f.semesters?.length ? f.semesters : undefined,
				years: f.years?.length ? f.years : undefined,
				faculty_ids: f.faculty_ids?.length ? f.faculty_ids : undefined,
				levels: f.levels?.length ? f.levels : undefined,
				languages: f.languages?.length ? f.languages : undefined,
				include_times: f.include_times?.length ? f.include_times : undefined,
				exclude_times: mergedExclude.length ? mergedExclude : undefined,
				lecturers: f.lecturers?.length ? f.lecturers : undefined,
				study_plan_ids: f.study_plan_ids?.length ? f.study_plan_ids : undefined,
				groups: f.groups?.length ? f.groups : undefined,
				categories: f.categories?.length ? f.categories : undefined,
				ects: f.ects?.length ? f.ects : undefined,
				mode_of_completions: f.mode_of_completions?.length ? f.mode_of_completions : undefined,
				mode_of_deliveries: f.mode_of_deliveries?.length ? f.mode_of_deliveries : undefined,
				completed_course_idents: f.completed_course_idents?.length ? f.completed_course_idents : undefined,
			}

			const data = await fetchCoursesFromService(payload)
			courses.value = data.data
			facets.value = data.facets
			pagination.value = data.meta
		} catch (e) {
			error.value = 'Failed to load courses'
			console.error('Courses: Failed to fetch', e)
		} finally {
			loading.value = false
		}
	}

	function initializeFromWizard() {
		const wizardStore = useWizardStore()
		const filtersStore = useFiltersStore()
		filtersStore.initializeFromWizard(wizardStore.studyPlanIds, wizardStore.completedCourseIdents)
	}

	function toggleCompletedCourse(courseIdent: string) {
		const wizardStore = useWizardStore()
		const filtersStore = useFiltersStore()
		wizardStore.toggleCompletedCourse(courseIdent)
		filtersStore.setFilter('completed_course_idents', [...wizardStore.completedCourseIdents])
	}

	function isCourseCompleted(courseIdent: string): boolean {
		const filtersStore = useFiltersStore()
		return filtersStore.filters.completed_course_idents?.includes(courseIdent) ?? false
	}

	// ── Proxy setters so existing components don't need to import filtersStore ──

	function setTitleSearch(title: string) {
		const filtersStore = useFiltersStore()
		filtersStore.setFilter('title', title)
	}

	function setFacultyIds(ids: string[]) {
		useFiltersStore().setFilter('faculty_ids', ids)
	}
	function setLevels(levels: string[]) {
		useFiltersStore().setFilter('levels', levels)
	}
	function setLanguages(languages: string[]) {
		useFiltersStore().setFilter('languages', languages)
	}
	function setLecturers(lecturers: string[]) {
		useFiltersStore().setFilter('lecturers', lecturers)
	}
	function setGroups(groups: CoursesFilter['groups']) {
		useFiltersStore().setFilter('groups', groups)
	}
	function setCategories(categories: CoursesFilter['categories']) {
		useFiltersStore().setFilter('categories', categories)
	}
	function setEcts(ects: number[]) {
		useFiltersStore().setFilter('ects', ects)
	}
	function setModesOfCompletion(modes: string[]) {
		useFiltersStore().setFilter('mode_of_completions', modes)
	}
	function addIncludeTime(ts: TimeSelection) {
		useFiltersStore().addIncludeTime(ts)
	}
	function removeIncludeTime(i: number) {
		useFiltersStore().removeIncludeTime(i)
	}
	function clearIncludeTimes() {
		useFiltersStore().clearIncludeTimes()
	}
	function addExcludeTime(ts: TimeSelection) {
		useFiltersStore().addExcludeTime(ts)
	}
	function removeExcludeTime(i: number) {
		useFiltersStore().removeExcludeTime(i)
	}
	function clearExcludeTimes() {
		useFiltersStore().clearExcludeTimes()
	}
	function setTimeFilterFromDrag(day: InSISDay, timeFrom: number, timeTo: number) {
		const filtersStore = useFiltersStore()
		filtersStore.filters.include_times = [{ day, time_from: timeFrom, time_to: timeTo }]
		filtersStore.filters.offset = 0
	}

	function setSortBy(sortBy: CourseSortBy) {
		const filtersStore = useFiltersStore()
		filtersStore.filters.sort_by = sortBy
	}

	function setSortDir(direction: SortDirection) {
		const filtersStore = useFiltersStore()
		filtersStore.filters.sort_dir = direction
	}

	function toggleSortDir() {
		const filtersStore = useFiltersStore()
		filtersStore.filters.sort_dir = filtersStore.filters.sort_dir === 'asc' ? 'desc' : 'asc'
	}

	function goToPage(page: number) {
		const filtersStore = useFiltersStore()
		if (page < 1 || page > totalPages.value) return
		filtersStore.filters.offset = (page - 1) * filtersStore.filters.limit
	}

	function nextPage() {
		if (hasNextPage.value) goToPage(currentPage.value + 1)
	}

	function prevPage() {
		if (hasPrevPage.value) goToPage(currentPage.value - 1)
	}

	function setPageSize(size: number) {
		const filtersStore = useFiltersStore()
		filtersStore.filters.limit = size
		filtersStore.filters.offset = 0
	}

	function toggleCourseExpansion(courseId: number) {
		if (expandedCourseIds.value.has(courseId)) {
			expandedCourseIds.value.delete(courseId)
		} else {
			expandedCourseIds.value.add(courseId)
		}
	}

	function isCourseExpanded(courseId: number): boolean {
		return expandedCourseIds.value.has(courseId)
	}

	function collapseAllCourses() {
		expandedCourseIds.value.clear()
	}

	function resetFilters() {
		const wizardStore = useWizardStore()
		const filtersStore = useFiltersStore()
		filtersStore.resetFilters(wizardStore.studyPlanIds, wizardStore.completedCourseIdents)
	}

	function resetAll() {
		courses.value = []
		expandedCourseIds.value.clear()
		const filtersStore = useFiltersStore()
		filtersStore.resetAll()
	}

	function toggleHideConflictingCourses() {
		const filtersStore = useFiltersStore()
		const timetableStore = useTimetableStore()
		filtersStore.toggleHideConflicting(timetableStore.selectedTimesForExclusion)
		filtersStore.filters.offset = 0
		fetchCourses()
	}

	return {
		courses,
		facets,
		pagination,
		loading,
		error,
		expandedCourseIds,
		// Filter proxies — delegates to filtersStore
		filters,
		hideConflictingCourses,
		hasActiveFilters,
		activeFilterCount,
		// Pagination
		totalPages,
		currentPage,
		hasNextPage,
		hasPrevPage,
		// Actions
		fetchCourses,
		initializeFromWizard,
		toggleCompletedCourse,
		isCourseCompleted,
		// Filter proxies
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
		setSortBy,
		setSortDir,
		toggleSortDir,
		goToPage,
		nextPage,
		prevPage,
		setPageSize,
		toggleCourseExpansion,
		isCourseExpanded,
		collapseAllCourses,
		resetFilters,
		resetAll,
		toggleHideConflictingCourses,
	}
})
