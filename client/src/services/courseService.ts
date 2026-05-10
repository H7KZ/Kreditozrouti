import type { CoursesResponse } from '@api/contracts'
import type { CoursesFilter } from '@shared/http/courses'
import api from '@client/api'

export async function fetchCourses(filters: Partial<CoursesFilter>): Promise<CoursesResponse> {
	const response = await api.post<CoursesResponse>('/courses', filters)
	return response.data
}
