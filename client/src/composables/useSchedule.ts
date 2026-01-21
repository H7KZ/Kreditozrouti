import api from '@client/api'
import { COURSE_COLORS, DEFAULT_TIME_FROM, DEFAULT_TIME_TO } from '@client/constants/schedule'
import type {
	Course,
	CourseFilterState,
	CoursesRequest,
	CoursesResponse,
	ScheduledCourse,
	StudyPlan,
	StudyPlansRequest,
	StudyPlansResponse,
} from '@client/types/schedule'
import { computed, ref } from 'vue'

export function useCoursesSearch() {
	const courses = ref<Course[]>([])
	const facets = ref<CoursesResponse['facets'] | null>(null)
	const meta = ref<CoursesResponse['meta'] | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	const filters = ref<CourseFilterState>({
		semester: [],
		year: [],
		ident: '',
		lecturer: [],
		day: [],
		language: [],
		level: [],
		faculty: [],
		study_plan_id: null,
		time_from: DEFAULT_TIME_FROM,
		time_to: DEFAULT_TIME_TO,
	})

	const totalCount = computed(() => meta.value?.count ?? 0)
	const hasMore = computed(() => {
		if (!meta.value) return false
		return meta.value.offset + meta.value.limit < meta.value.count
	})

	function buildRequest(limit = 20, offset = 0): CoursesRequest {
		const req: CoursesRequest = { limit, offset }

		if (filters.value.semester.length) req.semester = filters.value.semester
		if (filters.value.year.length) req.year = filters.value.year
		if (filters.value.ident.trim()) req.ident = filters.value.ident.trim()
		if (filters.value.lecturer.length) req.lecturer = filters.value.lecturer
		if (filters.value.day.length) req.day = filters.value.day
		if (filters.value.language.length) req.language = filters.value.language
		if (filters.value.level.length) req.level = filters.value.level
		if (filters.value.faculty.length) req.faculty = filters.value.faculty
		if (filters.value.study_plan_id) req.study_plan_id = filters.value.study_plan_id
		if (filters.value.time_from !== DEFAULT_TIME_FROM) req.time_from = filters.value.time_from
		if (filters.value.time_to !== DEFAULT_TIME_TO) req.time_to = filters.value.time_to

		return req
	}

	async function fetchCourses(limit = 20, offset = 0) {
		loading.value = true
		error.value = null

		try {
			const { data } = await api.post<CoursesResponse>('/courses', buildRequest(limit, offset))
			courses.value = offset === 0 ? data.data : [...courses.value, ...data.data]
			facets.value = data.facets
			meta.value = data.meta
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch courses'
			throw err
		} finally {
			loading.value = false
		}
	}

	async function loadMore() {
		if (!meta.value || loading.value || !hasMore.value) return
		await fetchCourses(meta.value.limit, meta.value.offset + meta.value.limit)
	}

	function resetFilters() {
		filters.value = {
			semester: [],
			year: [],
			ident: '',
			lecturer: [],
			day: [],
			language: [],
			level: [],
			faculty: [],
			study_plan_id: null,
			time_from: DEFAULT_TIME_FROM,
			time_to: DEFAULT_TIME_TO,
		}
	}

	return {
		courses,
		facets,
		meta,
		loading,
		error,
		filters,
		totalCount,
		hasMore,
		fetchCourses,
		loadMore,
		resetFilters,
	}
}

export function useScheduleBuilder() {
	const scheduledCourses = ref<ScheduledCourse[]>([])
	const colorIndex = ref(0)

	const scheduledCourseIds = computed(() => new Set(scheduledCourses.value.map((sc) => sc.course.id)))

	const totalCredits = computed(() => {
		const seen = new Set<number>()
		return scheduledCourses.value.reduce((sum, sc) => {
			if (seen.has(sc.course.id)) return sum
			seen.add(sc.course.id)
			return sum + (sc.course.ects ?? 0)
		}, 0)
	})

	const totalHours = computed(() => {
		return scheduledCourses.value.length * 1.5 // 90 min per slot
	})

	function getNextColor(): string {
		const color = COURSE_COLORS[colorIndex.value % COURSE_COLORS.length]
		if (!color) return '#000000'

		colorIndex.value++
		return color
	}

	function addToSchedule(course: Course, timeSlotIndex: number) {
		const exists = scheduledCourses.value.some((sc) => sc.course.id === course.id && sc.timeSlotIndex === timeSlotIndex)
		if (exists) {
			throw new Error('Tento termín je již v rozvrhu')
		}

		let color = scheduledCourses.value.find((sc) => sc.course.id === course.id)?.color
		if (!color) color = getNextColor()

		scheduledCourses.value.push({ course, timeSlotIndex, color })
	}

	function removeFromSchedule(courseId: number, timeSlotIndex: number) {
		const idx = scheduledCourses.value.findIndex((sc) => sc.course.id === courseId && sc.timeSlotIndex === timeSlotIndex)
		if (idx !== -1) scheduledCourses.value.splice(idx, 1)
	}

	function clearSchedule() {
		scheduledCourses.value = []
		colorIndex.value = 0
	}

	function isScheduled(courseId: number, timeSlotIndex?: number): boolean {
		if (timeSlotIndex === undefined) return scheduledCourseIds.value.has(courseId)
		return scheduledCourses.value.some((sc) => sc.course.id === courseId && sc.timeSlotIndex === timeSlotIndex)
	}

	return {
		scheduledCourses,
		scheduledCourseIds,
		totalCredits,
		totalHours,
		addToSchedule,
		removeFromSchedule,
		clearSchedule,
		isScheduled,
	}
}

export function useStudyPlans() {
	const studyPlans = ref<StudyPlan[]>([])
	const facets = ref<StudyPlansResponse['facets'] | null>(null)
	const loading = ref(false)

	async function fetchStudyPlans(request: StudyPlansRequest = {} as StudyPlansRequest) {
		loading.value = true
		try {
			const { data } = await api.post<StudyPlansResponse>('/study_plans', {
				...request,
				limit: request.limit ?? 100,
				offset: request.offset ?? 0,
			})
			studyPlans.value = data.data
			facets.value = data.facets
		} finally {
			loading.value = false
		}
	}

	return { studyPlans, facets, loading, fetchStudyPlans }
}
