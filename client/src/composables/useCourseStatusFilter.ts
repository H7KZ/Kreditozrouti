import { useCoursesStore, useTimetableStore } from '@client/stores'
import type { CourseStatus, CourseStatusFilterState, CourseStatusType } from '@client/types'
import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Course status filter options
 */
export interface StatusFilterOption {
	value: CourseStatusType
	label: string
	count: number
	icon: 'selected' | 'conflict' | 'incomplete'
	colorClass: string
}

/**
 * Composable for filtering courses by their timetable status.
 * Supports multi-select filtering for:
 * - All selected courses
 * - Courses with conflicts
 * - Courses with incomplete unit selections
 * - Specific course idents
 *
 * @example
 * ```ts
 * const {
 *   statusFilters,
 *   selectedStatuses,
 *   selectedCourseIdents,
 *   filterOptions,
 *   coursesWithStatus,
 *   toggleStatusFilter,
 *   toggleCourseFilter,
 *   clearFilters,
 *   isFiltering,
 * } = useCourseStatusFilter()
 * ```
 */
export function useCourseStatusFilter() {
	const { t } = useI18n({ useScope: 'global' })
	const timetableStore = useTimetableStore()
	const coursesStore = useCoursesStore()

	// Filter state
	const selectedStatuses: Ref<CourseStatusType[]> = ref([])
	const selectedCourseIdents: Ref<string[]> = ref([])

	/**
	 * All course statuses from timetable store
	 */
	const allCourseStatuses = computed<CourseStatus[]>(() => Array.from(timetableStore.courseStatuses.values()))

	/**
	 * Count of courses by status type
	 */
	const statusCounts = computed(() => {
		const counts = {
			selected: 0,
			conflict: 0,
			incomplete: 0,
		}

		for (const status of allCourseStatuses.value) {
			counts[status.status]++
		}

		return counts
	})

	/**
	 * Total selected courses count
	 */
	const totalSelectedCount = computed(() => timetableStore.selectedCourseIds.length)

	/**
	 * Courses that have conflicts
	 */
	const coursesWithConflicts = computed<CourseStatus[]>(() => allCourseStatuses.value.filter((s) => s.status === 'conflict'))

	/**
	 * Courses that have incomplete selections
	 */
	const coursesWithIncomplete = computed<CourseStatus[]>(() => allCourseStatuses.value.filter((s) => s.status === 'incomplete'))

	/**
	 * Filter options for the checkbox group
	 */
	const filterOptions = computed<StatusFilterOption[]>(() => [
		{
			value: 'selected',
			label: t('components.filters.CourseStatusFilter.allSelected'),
			count: totalSelectedCount.value,
			icon: 'selected',
			colorClass: 'text-blue-600 bg-blue-100',
		},
		{
			value: 'conflict',
			label: t('components.filters.CourseStatusFilter.withConflicts'),
			count: statusCounts.value.conflict,
			icon: 'conflict',
			colorClass: 'text-red-600 bg-red-100',
		},
		{
			value: 'incomplete',
			label: t('components.filters.CourseStatusFilter.incomplete'),
			count: statusCounts.value.incomplete,
			icon: 'incomplete',
			colorClass: 'text-amber-600 bg-amber-100',
		},
	])

	/**
	 * Individual course options for specific filtering
	 * Grouped by status for better UX
	 */
	const courseOptions = computed(() => {
		const conflicts = coursesWithConflicts.value.map((c) => ({
			...c,
			groupLabel: t('components.filters.CourseStatusFilter.conflictingCourses'),
		}))

		const incomplete = coursesWithIncomplete.value.map((c) => ({
			...c,
			groupLabel: t('components.filters.CourseStatusFilter.incompleteCourses'),
		}))

		return { conflicts, incomplete }
	})

	/**
	 * Whether any status filter is active
	 */
	const isFilteringByStatus = computed(() => selectedStatuses.value.length > 0)

	/**
	 * Whether any course ident filter is active
	 */
	const isFilteringByCourse = computed(() => selectedCourseIdents.value.length > 0)

	/**
	 * Whether any filter is active
	 */
	const isFiltering = computed(() => isFilteringByStatus.value || isFilteringByCourse.value)

	/**
	 * Get all course idents that should be shown based on current filters.
	 * When filtering by conflict, includes ALL courses involved in conflicts.
	 */
	const filteredCourseIdents = computed<string[]>(() => {
		if (!isFiltering.value) return []

		const idents = new Set<string>()

		// Add courses based on status filters
		for (const status of selectedStatuses.value) {
			if (status === 'selected') {
				// Add all selected courses
				for (const courseStatus of allCourseStatuses.value) {
					idents.add(courseStatus.ident)
				}
			} else if (status === 'conflict') {
				// Add ALL courses involved in conflicts (both sides)
				for (const courseStatus of coursesWithConflicts.value) {
					idents.add(courseStatus.ident)
					// Also add courses they conflict WITH
					for (const conflictIdent of courseStatus.conflictsWith) {
						idents.add(conflictIdent)
					}
				}
			} else if (status === 'incomplete') {
				for (const courseStatus of coursesWithIncomplete.value) {
					idents.add(courseStatus.ident)
				}
			}
		}

		// Add specifically selected course idents
		for (const ident of selectedCourseIdents.value) {
			idents.add(ident)

			// If this course has conflicts, also add conflicting courses
			const courseStatus = allCourseStatuses.value.find((c) => c.ident === ident)
			if (courseStatus?.status === 'conflict') {
				for (const conflictIdent of courseStatus.conflictsWith) {
					idents.add(conflictIdent)
				}
			}
		}

		return Array.from(idents)
	})

	/**
	 * Toggle a status filter
	 */
	function toggleStatusFilter(status: CourseStatusType) {
		const index = selectedStatuses.value.indexOf(status)
		if (index === -1) {
			selectedStatuses.value.push(status)
		} else {
			selectedStatuses.value.splice(index, 1)
		}
		applyFilters()
	}

	/**
	 * Toggle a specific course filter
	 */
	function toggleCourseFilter(ident: string) {
		const index = selectedCourseIdents.value.indexOf(ident)
		if (index === -1) {
			selectedCourseIdents.value.push(ident)
		} else {
			selectedCourseIdents.value.splice(index, 1)
		}
		applyFilters()
	}

	/**
	 * Set status filters directly
	 */
	function setStatusFilters(statuses: CourseStatusType[]) {
		selectedStatuses.value = [...statuses]
		applyFilters()
	}

	/**
	 * Set course filters directly
	 */
	function setCourseFilters(idents: string[]) {
		selectedCourseIdents.value = [...idents]
		applyFilters()
	}

	/**
	 * Clear all filters
	 */
	function clearFilters() {
		selectedStatuses.value = []
		selectedCourseIdents.value = []
		applyFilters()
	}

	/**
	 * Apply filters to the courses store
	 */
	function applyFilters() {
		if (filteredCourseIdents.value.length > 0) {
			coursesStore.filters.idents = filteredCourseIdents.value
		} else {
			coursesStore.filters.idents = []
		}
		coursesStore.filters.offset = 0
		coursesStore.fetchCourses()
	}

	/**
	 * Check if a status is currently selected
	 */
	function isStatusSelected(status: CourseStatusType): boolean {
		return selectedStatuses.value.includes(status)
	}

	/**
	 * Check if a course ident is currently selected
	 */
	function isCourseSelected(ident: string): boolean {
		return selectedCourseIdents.value.includes(ident)
	}

	/**
	 * Get the current filter state for persistence
	 */
	function getFilterState(): CourseStatusFilterState {
		return {
			selectedStatuses: [...selectedStatuses.value],
			selectedCourseIdents: [...selectedCourseIdents.value],
		}
	}

	/**
	 * Restore filter state
	 */
	function setFilterState(state: CourseStatusFilterState) {
		selectedStatuses.value = state.selectedStatuses || []
		selectedCourseIdents.value = state.selectedCourseIdents || []
	}

	return {
		// State
		selectedStatuses,
		selectedCourseIdents,

		// Computed
		allCourseStatuses,
		statusCounts,
		totalSelectedCount,
		coursesWithConflicts,
		coursesWithIncomplete,
		filterOptions,
		courseOptions,
		filteredCourseIdents,
		isFilteringByStatus,
		isFilteringByCourse,
		isFiltering,

		// Actions
		toggleStatusFilter,
		toggleCourseFilter,
		setStatusFilters,
		setCourseFilters,
		clearFilters,
		applyFilters,
		isStatusSelected,
		isCourseSelected,
		getFilterState,
		setFilterState,
	}
}

/**
 * Create a singleton instance for shared state across components
 */
let sharedInstance: ReturnType<typeof useCourseStatusFilter> | null = null

export function useSharedCourseStatusFilter() {
	if (!sharedInstance) {
		sharedInstance = useCourseStatusFilter()
	}
	return sharedInstance
}

/**
 * Reset shared instance (for testing or page transitions)
 */
export function resetCourseStatusFilter() {
	sharedInstance = null
}
