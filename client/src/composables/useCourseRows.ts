import { useCoursesStore } from '@client/stores/courses.store'
import { useFiltersStore } from '@client/stores/filters.store'
import { useTimetableStore } from '@client/stores/timetable.store'
import type { CourseSortBy } from '@client/types'

/**
 * Composable for CourseTable row interactions:
 * sort handling, row expansion, timetable selection state.
 */
export function useCourseRows() {
	const coursesStore = useCoursesStore()
	const filtersStore = useFiltersStore()
	const timetableStore = useTimetableStore()

	function handleSort(key: CourseSortBy) {
		if (key === filtersStore.filters.sort_by) {
			coursesStore.toggleSortDir()
		} else {
			coursesStore.setSortBy(key)
			coursesStore.setSortDir('asc')
		}
		coursesStore.fetchCourses()
	}

	function handleRowClick(courseId: number) {
		coursesStore.toggleCourseExpansion(courseId)
	}

	function isExpanded(courseId: number): boolean {
		return coursesStore.isCourseExpanded(courseId)
	}

	function hasSelectedUnits(courseId: number): boolean {
		return timetableStore.hasCourseSelected(courseId)
	}

	function hasMissingUnitTypes(courseId: number): boolean {
		return timetableStore.courseHasMissingUnitTypes(courseId)
	}

	return {
		handleSort,
		handleRowClick,
		isExpanded,
		hasSelectedUnits,
		hasMissingUnitTypes,
		filters: filtersStore.filters,
	}
}
