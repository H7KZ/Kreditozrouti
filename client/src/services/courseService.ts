import type { CoursesResponse } from '@api/contracts'
import api from '@client/api'
import type { CoursesFilter } from '@shared/http/courses'

export async function fetchCourses(filters: Partial<CoursesFilter>): Promise<CoursesResponse> {
	const response = await api.post<CoursesResponse>('/courses', filters)
	return response.data
}
