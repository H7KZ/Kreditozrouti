import CoursesRequest from '@api/Controllers/Kreditozrouti/types/CoursesRequest.ts'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse.ts'
import { CourseWithRelations } from '@api/Database/types'
import { TimeSelection } from '@api/Interfaces/Timetable.ts'
import { CoursesFilter } from '@api/Validations/CoursesFilterValidation.ts'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

const defaultFilter: CoursesFilter = {
	title: '',
	semester: [],
	year: [],
	faculty_id: [],
	level: [],
	language: [],
	day: [],
	time_from: undefined,
	time_to: undefined,
	exclude_times: [],
	lecturer: [],
	study_plan_id: undefined,
	group: [],
	category: [],
	ects: [],
	mode_of_completion: [],
	mode_of_delivery: [],
	has_capacity: undefined,
	exclude_slot_ids: [],
	limit: 20,
	offset: 0,
	sort_by: 'ident',
	sort_dir: 'asc',
}

export const useCoursesStore = defineStore('courses', () => {
	// State
	const courses = ref<CourseWithRelations[]>([])
	const filter = reactive<CoursesFilter>({ ...defaultFilter })
	const loading = ref(false)
	const error = ref<string | null>(null)

	// Pagination
	const limit = ref(50)
	const offset = ref(0)
	const total = ref(0)

	// Facets from API
	const facets = ref<CoursesResponse['facets'] | null>(null)

	// Selected courses (for timetable building)
	const selectedCourseIds = ref<Set<number>>(new Set())

	// Computed
	const hasFacets = computed(() => {
		return (
			filter.title ||
			filter.semester ||
			filter.year ||
			filter.faculty_id ||
			filter.level ||
			filter.language ||
			filter.day ||
			filter.time_from ||
			filter.time_to ||
			filter.exclude_times ||
			filter.lecturer ||
			filter.group ||
			filter.category ||
			filter.ects ||
			filter.mode_of_completion ||
			filter.has_capacity !== null
		)
	})

	const countFacet = (facet: keyof CoursesFilter) => {
		const value = filter[facet]
		if (Array.isArray(value)) {
			return value.length
		} else if (value !== null && value !== undefined) {
			return 1
		}
		return 0
	}

	const activeFilterCount = computed(() => {
		let count = 0
		const facets: (keyof CoursesFilter)[] = [
			'title',
			'semester',
			'year',
			'faculty_id',
			'level',
			'language',
			'day',
			'time_from',
			'time_to',
			'exclude_times',
			'lecturer',
			'group',
			'category',
			'ects',
			'mode_of_completion',
			'has_capacity',
		]
		for (const facet of facets) {
			count += countFacet(facet)
		}
		return count
	})

	const selectedCourses = computed(() => {
		return courses.value.filter((c) => selectedCourseIds.value.has(c.id))
	})

	const totalPages = computed(() => {
		return Math.ceil(total.value / limit.value)
	})

	const currentPage = computed(() => {
		return Math.floor(offset.value / limit.value) + 1
	})

	// Build request object from filter
	const buildRequest = computed((): CoursesRequest => {
		const req: CoursesRequest = {
			limit: limit.value,
			offset: offset.value,
			sort_by: filter.sort_by,
			sort_dir: filter.sort_dir,
		}

		if (filter.title) req.title = filter.title
		if (filter.semester?.length) req.semester = filter.semester
		if (filter.year !== undefined) req.year = filter.year
		if (filter.faculty_id?.length) req.faculty_id = filter.faculty_id
		if (filter.level?.length) req.level = filter.level
		if (filter.language?.length) req.language = filter.language
		if (filter.day?.length) req.day = filter.day
		if (filter.time_from !== null) req.time_from = filter.time_from
		if (filter.time_to !== null) req.time_to = filter.time_to
		if (filter.lecturer?.length) req.lecturer = filter.lecturer
		if (filter.study_plan_id) req.study_plan_id = filter.study_plan_id
		if (filter.group?.length) req.group = filter.group
		if (filter.category?.length) req.category = filter.category
		if (filter.ects !== undefined) req.ects = filter.ects
		if (filter.mode_of_completion?.length) req.mode_of_completion = filter.mode_of_completion
		if (filter.has_capacity !== null) req.has_capacity = filter.has_capacity
		if (filter.exclude_times?.length) req.exclude_times = filter.exclude_times

		return req
	})

	// Actions
	function setCourses(data: CourseWithRelations[], meta: { total: number; count: number }) {
		courses.value = data
		total.value = meta.total
	}

	function setFacets(f: CoursesResponse['facets']) {
		facets.value = f
	}

	function setLoading(l: boolean) {
		loading.value = l
	}

	function setError(e: string | null) {
		error.value = e
	}

	function updateFilter<K extends keyof CoursesFilter>(key: K, value: CoursesFilter[K]) {
		filter[key] = value
		offset.value = 0 // Reset pagination on filter change
	}

	function toggleArrayFilter<K extends keyof CoursesFilter>(key: K, value: CoursesFilter[K] extends unknown[] ? CoursesFilter[K][number] : unknown) {
		const arr = filter[key] as unknown[]
		const index = arr.indexOf(value)
		if (index === -1) {
			arr.push(value)
		} else {
			arr.splice(index, 1)
		}
		offset.value = 0 // Reset pagination
	}

	function setTimeRange(from?: number, to?: number) {
		filter.time_from = from
		filter.time_to = to
		offset.value = 0
	}

	function addTimeExclusion(exclusion: TimeSelection) {
		if (!filter.exclude_times) filter.exclude_times = []
		filter.exclude_times.push(exclusion)
		offset.value = 0
	}

	function removeTimeExclusion(index: number) {
		if (!filter.exclude_times) return
		filter.exclude_times.splice(index, 1)
		offset.value = 0
	}

	function clearTimeExclusions() {
		filter.exclude_times = []
		offset.value = 0
	}

	function setStudyPlanContext(studyPlanId?: number | number[]) {
		filter.study_plan_id = studyPlanId
		offset.value = 0
	}

	function setSorting(sortBy: CoursesFilter['sort_by'], sortDir: CoursesFilter['sort_dir']) {
		filter.sort_by = sortBy
		filter.sort_dir = sortDir
		offset.value = 0
	}

	function setPage(page: number) {
		offset.value = (page - 1) * limit.value
	}

	function setLimit(l: number) {
		limit.value = l
		offset.value = 0
	}

	function toggleCourseSelection(courseId: number) {
		if (selectedCourseIds.value.has(courseId)) {
			selectedCourseIds.value.delete(courseId)
		} else {
			selectedCourseIds.value.add(courseId)
		}
	}

	function selectCourse(courseId: number) {
		selectedCourseIds.value.add(courseId)
	}

	function deselectCourse(courseId: number) {
		selectedCourseIds.value.delete(courseId)
	}

	function clearSelection() {
		selectedCourseIds.value.clear()
	}

	function resetFilters() {
		Object.assign(filter, { ...defaultFilter })
		offset.value = 0
	}

	function reset() {
		courses.value = []
		Object.assign(filter, { ...defaultFilter })
		loading.value = false
		error.value = null
		limit.value = 50
		offset.value = 0
		total.value = 0
		facets.value = null
		selectedCourseIds.value.clear()
	}

	return {
		// State
		courses,
		filter,
		loading,
		error,
		limit,
		offset,
		total,
		facets,
		selectedCourseIds,

		// Computed
		hasFilters: hasFacets,
		activeFilterCount,
		selectedCourses,
		totalPages,
		currentPage,
		buildRequest,

		// Actions
		setCourses,
		setFacets,
		setLoading,
		setError,
		updateFilter,
		toggleArrayFilter,
		setTimeRange,
		addTimeExclusion,
		removeTimeExclusion,
		clearTimeExclusions,
		setStudyPlanContext,
		setSorting,
		setPage,
		setLimit,
		toggleCourseSelection,
		selectCourse,
		deselectCourse,
		clearSelection,
		resetFilters,
		reset,
	}
})
