import type CoursesResponse from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
import type { CoursesFilter } from '@api/Validations/CoursesFilterValidation'
import api from '@client/api'

export async function fetchCourses(filters: Partial<CoursesFilter>): Promise<CoursesResponse> {
	const response = await api.post<CoursesResponse>('/courses', filters)
	return response.data
}
