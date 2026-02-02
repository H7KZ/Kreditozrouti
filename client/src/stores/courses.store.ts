import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse.ts'
import InSISService from '@api/Services/InSISService.ts'
import { TimeSelection } from '@api/Validations'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import api from '@client/api'
import { useTimetableStore, useWizardStore } from '@client/stores'
import { CourseSortBy, CoursesState, SortDirection } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
import InSISStudyPlanCourseCategory from '@scraper/Types/InSISStudyPlanCourseCategory.ts'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup.ts'
import { defineStore } from 'pinia'

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
		completed_course_idents: [],
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
 * Supports multiple study plan IDs for filtering.
 * Supports completed course ident exclusion.
 * Supports timetable-based collision exclusion via exclude_times.
 *
 * The `exclude_times` filter combines two sources:
 * 1. Manual exclusions from FilterTimeRange (stored in `filters.exclude_times`)
 * 2. Auto-generated exclusions from timetable (stored in `timetableExcludeTimes`)
 * These are merged at API call time so they don't interfere with each other.
 */
export const useCoursesStore = defineStore('courses', {
	state: (): CoursesState => ({
		filters: createDefaultFilters(),
		courses: [],
		facets: {
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
		},
		pagination: {
			limit: 50,
			offset: 0,
			count: 0,
			total: 0,
		},
		loading: false,
		error: null,
		expandedCourseIds: new Set(),
		hideConflictingCourses: false,
		timetableExcludeTimes: [],
	}),

	getters: {
		/** Total pages available */
		totalPages(): number {
			return Math.ceil(this.pagination.total / this.pagination.limit)
		},

		/** Current page (1-indexed) */
		currentPage(): number {
			return Math.floor(this.pagination.offset / this.pagination.limit) + 1
		},

		/** Whether there are more pages */
		hasNextPage(): boolean {
			return this.currentPage < this.totalPages
		},

		/** Whether there's a previous page */
		hasPrevPage(): boolean {
			return this.currentPage > 1
		},

		/** Active filter count (for UI indicators) */
		activeFilterCount(): number {
			const f = this.filters
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
			if (this.hideConflictingCourses) count++

			return count
		},

		/** Whether any filters are active */
		hasActiveFilters(): boolean {
			return this.activeFilterCount > 0
		},

		/**
		 * Merged exclude_times: manual exclusions + timetable-derived exclusions.
		 * Used when building the API payload.
		 */
		mergedExcludeTimes(): TimeSelection[] {
			const manual = this.filters.exclude_times || []
			const timetable = this.hideConflictingCourses ? this.timetableExcludeTimes : []
			return [...manual, ...timetable]
		},
	},

	actions: {
		/** Initialize filters from wizard selection (supports multiple study plans + completed courses) */
		initializeFromWizard() {
			const wizardStore = useWizardStore()

			// Use multiple study plan IDs from wizard
			if (wizardStore.studyPlanIds.length > 0) {
				this.filters.study_plan_ids = [...wizardStore.studyPlanIds]
			} else if (wizardStore.studyPlanId) {
				// Fallback to single ID for backward compatibility
				this.filters.study_plan_ids = [wizardStore.studyPlanId]
			}

			// Apply completed course idents from wizard
			if (wizardStore.completedCourseIdents.length > 0) {
				this.filters.completed_course_idents = [...wizardStore.completedCourseIdents]
			}

			const upcomingPeriod = InSISService.getUpcomingPeriod()

			this.filters.years = [upcomingPeriod.year]
			this.filters.semesters = [upcomingPeriod.semester]
		},

		/** Fetch courses from API */
		async fetchCourses() {
			this.loading = true
			this.error = null

			try {
				// Merge manual + timetable exclude_times for the API call
				const effectiveExcludeTimes = this.mergedExcludeTimes

				const payload: Partial<CoursesFilter> = {
					...this.filters,
					ids: this.filters.ids?.length ? this.filters.ids : undefined,
					idents: this.filters.idents?.length ? this.filters.idents : undefined,
					title: this.filters.title || undefined,
					semesters: this.filters.semesters?.length ? this.filters.semesters : undefined,
					years: this.filters.years?.length ? this.filters.years : undefined,
					faculty_ids: this.filters.faculty_ids?.length ? this.filters.faculty_ids : undefined,
					levels: this.filters.levels?.length ? this.filters.levels : undefined,
					languages: this.filters.languages?.length ? this.filters.languages : undefined,
					include_times: this.filters.include_times?.length ? this.filters.include_times : undefined,
					// Use the merged exclude_times (manual + timetable)
					exclude_times: effectiveExcludeTimes.length ? effectiveExcludeTimes : undefined,
					lecturers: this.filters.lecturers?.length ? this.filters.lecturers : undefined,
					study_plan_ids: this.filters.study_plan_ids?.length ? this.filters.study_plan_ids : undefined,
					groups: this.filters.groups?.length ? this.filters.groups : undefined,
					categories: this.filters.categories?.length ? this.filters.categories : undefined,
					ects: this.filters.ects?.length ? this.filters.ects : undefined,
					mode_of_completions: this.filters.mode_of_completions?.length ? this.filters.mode_of_completions : undefined,
					mode_of_deliveries: this.filters.mode_of_deliveries?.length ? this.filters.mode_of_deliveries : undefined,
					completed_course_idents: this.filters.completed_course_idents?.length ? this.filters.completed_course_idents : undefined,
				}

				const response = await api.post<CoursesResponse>('/courses', payload)

				this.courses = response.data.data
				this.facets = response.data.facets
				this.pagination = response.data.meta
			} catch (e) {
				this.error = 'Failed to load courses'
				console.error('Courses: Failed to fetch', e)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Toggle hiding courses that conflict with the timetable.
		 * When enabled, computes exclude_times from timetable selected units
		 * and merges them into the API call.
		 */
		toggleHideConflictingCourses() {
			this.hideConflictingCourses = !this.hideConflictingCourses

			if (this.hideConflictingCourses) {
				this.syncTimetableExcludeTimes()
			} else {
				this.timetableExcludeTimes = []
			}

			this.filters.offset = 0
			this.fetchCourses()
		},

		/**
		 * Sync timetable-derived exclude_times from the timetable store.
		 * Called when timetable changes while the toggle is active,
		 * or when the toggle is first enabled.
		 * Does NOT auto-fetch — caller is responsible for fetching if needed.
		 */
		syncTimetableExcludeTimes() {
			const timetableStore = useTimetableStore()
			this.timetableExcludeTimes = [...timetableStore.selectedTimesForExclusion]
		},

		/**
		 * Toggle a course as completed/not completed.
		 * Updates both the local filter and the wizard store's persisted state.
		 */
		toggleCompletedCourse(courseIdent: string) {
			const wizardStore = useWizardStore()
			wizardStore.toggleCompletedCourse(courseIdent)

			// Sync with filters
			this.filters.completed_course_idents = [...wizardStore.completedCourseIdents]
		},

		/** Check if a course is marked as completed */
		isCourseCompleted(courseIdent: string): boolean {
			return this.filters.completed_course_idents?.includes(courseIdent) ?? false
		},

		/** Set text search filter */
		setTitleSearch(title: string) {
			this.filters.title = title
			this.filters.offset = 0
		},

		/** Set faculty filter */
		setFacultyIds(ids: string[]) {
			this.filters.faculty_ids = ids
			this.filters.offset = 0
		},

		/** Set level filter */
		setLevels(levels: string[]) {
			this.filters.levels = levels
			this.filters.offset = 0
		},

		/** Set language filter */
		setLanguages(languages: string[]) {
			this.filters.languages = languages
			this.filters.offset = 0
		},

		/** Set lecturer filter */
		setLecturers(lecturers: string[]) {
			this.filters.lecturers = lecturers
			this.filters.offset = 0
		},

		/** Set study plan groups filter */
		setGroups(groups: InSISStudyPlanCourseGroup[]) {
			this.filters.groups = groups
			this.filters.offset = 0
		},

		/** Set study plan categories filter */
		setCategories(categories: InSISStudyPlanCourseCategory[]) {
			this.filters.categories = categories
			this.filters.offset = 0
		},

		/** Set ECTS filter */
		setEcts(ects: number[]) {
			this.filters.ects = ects
			this.filters.offset = 0
		},

		/** Set mode of completion filter */
		setModesOfCompletion(modes: string[]) {
			this.filters.mode_of_completions = modes
			this.filters.offset = 0
		},

		/** Add a time inclusion filter */
		addIncludeTime(timeSelection: TimeSelection) {
			if (!this.filters.include_times) this.filters.include_times = []
			this.filters.include_times.push(timeSelection)
			this.filters.offset = 0
		},

		/** Remove a time inclusion filter */
		removeIncludeTime(index: number) {
			if (!this.filters.include_times) return
			this.filters.include_times.splice(index, 1)
			this.filters.offset = 0
		},

		/** Clear all time inclusion filters */
		clearIncludeTimes() {
			this.filters.include_times = []
			this.filters.offset = 0
		},

		/** Add a time exclusion filter */
		addExcludeTime(timeSelection: TimeSelection) {
			if (!this.filters.exclude_times) this.filters.exclude_times = []
			this.filters.exclude_times.push(timeSelection)
			this.filters.offset = 0
		},

		/** Remove a time exclusion filter */
		removeExcludeTime(index: number) {
			if (!this.filters.exclude_times) return
			this.filters.exclude_times.splice(index, 1)
			this.filters.offset = 0
		},

		/** Clear all time exclusion filters */
		clearExcludeTimes() {
			this.filters.exclude_times = []
			this.filters.offset = 0
		},

		/**
		 * Set time filter from timetable drag selection
		 * This is used by the drag-to-filter feature
		 */
		setTimeFilterFromDrag(day: InSISDay, timeFrom: number, timeTo: number) {
			this.filters.include_times = [
				{
					day,
					time_from: timeFrom,
					time_to: timeTo,
				},
			]
			this.filters.offset = 0
		},

		/** Set sort field */
		setSortBy(sortBy: CourseSortBy) {
			this.filters.sort_by = sortBy
		},

		/** Set sort direction */
		setSortDir(direction: SortDirection) {
			this.filters.sort_dir = direction
		},

		/** Toggle sort direction */
		toggleSortDir() {
			this.filters.sort_dir = this.filters.sort_dir === 'asc' ? 'desc' : 'asc'
		},

		/** Go to specific page (1-indexed) */
		goToPage(page: number) {
			if (page < 1 || page > this.totalPages) return
			this.filters.offset = (page - 1) * this.filters.limit
		},

		/** Go to next page */
		nextPage() {
			if (this.hasNextPage) {
				this.goToPage(this.currentPage + 1)
			}
		},

		/** Go to previous page */
		prevPage() {
			if (this.hasPrevPage) {
				this.goToPage(this.currentPage - 1)
			}
		},

		/** Set page size */
		setPageSize(size: number) {
			this.filters.limit = size
			this.filters.offset = 0
		},

		/** Toggle row expansion for a course */
		toggleCourseExpansion(courseId: number) {
			if (this.expandedCourseIds.has(courseId)) {
				this.expandedCourseIds.delete(courseId)
			} else {
				this.expandedCourseIds.add(courseId)
			}
		},

		/** Check if a course row is expanded */
		isCourseExpanded(courseId: number): boolean {
			return this.expandedCourseIds.has(courseId)
		},

		/** Collapse all expanded rows */
		collapseAllCourses() {
			this.expandedCourseIds.clear()
		},

		/** Reset all filters to defaults (keeps wizard-derived filters) */
		resetFilters() {
			const wizardStore = useWizardStore()
			const defaults = createDefaultFilters()

			// Use multiple study plan IDs from wizard
			if (wizardStore.studyPlanIds.length > 0) {
				defaults.study_plan_ids = [...wizardStore.studyPlanIds]
			} else if (wizardStore.studyPlanId) {
				defaults.study_plan_ids = [wizardStore.studyPlanId]
			}

			// Preserve completed course idents
			if (wizardStore.completedCourseIdents.length > 0) {
				defaults.completed_course_idents = [...wizardStore.completedCourseIdents]
			}

			const upcomingPeriod = InSISService.getUpcomingPeriod()

			defaults.years = [upcomingPeriod.year]
			defaults.semesters = [upcomingPeriod.semester]

			this.filters = defaults

			// Also reset the timetable collision toggle
			this.hideConflictingCourses = false
			this.timetableExcludeTimes = []
		},

		/** Reset everything including wizard filters */
		resetAll() {
			this.filters = createDefaultFilters()
			this.courses = []
			this.expandedCourseIds.clear()
			this.hideConflictingCourses = false
			this.timetableExcludeTimes = []
		},
	},
})
