import CoursesRequest from '@api/Controllers/Kreditozrouti/types/CoursesRequest.ts'
import CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse.ts'
import StudyPlansRequest from '@api/Controllers/Kreditozrouti/types/StudyPlansRequest.ts'
import StudyPlansResponse from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse.ts'
import { CourseWithRelations, StudyPlanWithRelations } from '@api/Database/types'
import api from '@client/api.ts'
import { ref } from 'vue'

// Generic API response handler
async function handleApiCall<T>(
	apiCall: () => Promise<{ data: T }>,
	options?: {
		onSuccess?: (data: T) => void
		onError?: (error: Error) => void
	},
): Promise<{ data: T | null; error: Error | null }> {
	try {
		const response = await apiCall()
		options?.onSuccess?.(response.data)
		return { data: response.data, error: null }
	} catch (err) {
		const error = err instanceof Error ? err : new Error('Unknown error')
		options?.onError?.(error)
		return { data: null, error }
	}
}

export function useCoursesApi() {
	const loading = ref(false)
	const error = ref<Error | null>(null)

	async function fetchCourses(params: CoursesRequest): Promise<CoursesResponse | null> {
		loading.value = true
		error.value = null

		const result = await handleApiCall(() => api.get<CoursesResponse>('/courses', { params }))

		loading.value = false
		error.value = result.error

		return result.data
	}

	async function fetchCourseById(id: number): Promise<CourseWithRelations | null> {
		loading.value = true
		error.value = null

		const result = await handleApiCall(() => api.get<CourseWithRelations>(`/courses/${id}`))

		loading.value = false
		error.value = result.error

		return result.data
	}

	async function fetchCourseByIdent(ident: string): Promise<CourseWithRelations | null> {
		loading.value = true
		error.value = null

		const result = await handleApiCall(() => api.get<CoursesResponse>('/courses', { params: { ident } }))

		loading.value = false
		error.value = result.error

		return result.data?.data[0] || null
	}

	return {
		loading,
		error,
		fetchCourses,
		fetchCourseById,
		fetchCourseByIdent,
	}
}

export function useStudyPlansApi() {
	const loading = ref(false)
	const error = ref<Error | null>(null)

	async function fetchStudyPlans(params: Partial<StudyPlansRequest>): Promise<StudyPlansResponse | null> {
		loading.value = true
		error.value = null

		const result = await handleApiCall(() => api.get<StudyPlansResponse>('/study-plans', { params }))

		loading.value = false
		error.value = result.error

		return result.data
	}

	async function fetchStudyPlanById(id: number): Promise<StudyPlanWithRelations | null> {
		loading.value = true
		error.value = null

		const result = await handleApiCall(() => api.get<StudyPlanWithRelations>(`/study-plans/${id}`))

		loading.value = false
		error.value = result.error

		return result.data
	}

	async function fetchStudyPlanCourses(studyPlanId: number): Promise<CoursesResponse | null> {
		loading.value = true
		error.value = null

		const result = await handleApiCall(() =>
			api.get<CoursesResponse>('/courses', {
				params: { study_plan_id: studyPlanId, limit: 200 },
			}),
		)

		loading.value = false
		error.value = result.error

		return result.data
	}

	return {
		loading,
		error,
		fetchStudyPlans,
		fetchStudyPlanById,
		fetchStudyPlanCourses,
	}
}

export function useApi() {
	const coursesApi = useCoursesApi()
	const studyPlansApi = useStudyPlansApi()

	return {
		courses: coursesApi,
		studyPlans: studyPlansApi,
	}
}

export default useApi
