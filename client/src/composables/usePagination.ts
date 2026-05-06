import { useCoursesStore } from '@client/stores/courses.store'
import { computed } from 'vue'

/**
 * Composable for course list pagination display and navigation.
 */
export function usePagination() {
	const coursesStore = useCoursesStore()

	const from = computed(() => coursesStore.pagination.offset + 1)
	const to = computed(() => Math.min(coursesStore.pagination.offset + coursesStore.pagination.count, coursesStore.pagination.total))
	const total = computed(() => coursesStore.pagination.total)
	const showPagination = computed(() => coursesStore.pagination.total > coursesStore.pagination.limit)

	async function goToPage(page: () => void) {
		page()
		await coursesStore.fetchCourses()
	}

	return {
		from,
		to,
		total,
		showPagination,
		currentPage: computed(() => coursesStore.currentPage),
		totalPages: computed(() => coursesStore.totalPages),
		hasNextPage: computed(() => coursesStore.hasNextPage),
		hasPrevPage: computed(() => coursesStore.hasPrevPage),
		nextPage: () => goToPage(coursesStore.nextPage),
		prevPage: () => goToPage(coursesStore.prevPage),
		goToPage,
	}
}
