import api from '@client/api'
import type { CoursesFilter } from '@shared/http/courses'
import type { CoursesResponse } from '../../../api/src/Contracts'

export async function fetchCourses(filters: Partial<CoursesFilter>): Promise<CoursesResponse> {
	const response = await api.post<CoursesResponse>('/courses', filters)
	return response.data
}

export class RateLimitedError extends Error {
	readonly type = 'RATE_LIMITED' as const
	constructor() {
		super('Rate limited')
		this.name = 'RateLimitedError'
	}
}

export async function triggerCourseScrape(courseId: number): Promise<{ jobId: string }> {
	const response = await api.post<{ jobId: string }>(
		`/courses/${courseId}/scrape`,
		{},
		{
			// Treat 429 as a non-error response so the global alert interceptor is bypassed.
			// The composable checks response.status and throws RateLimitedError itself.
			validateStatus: (s) => s === 202 || s === 429,
		},
	)
	if (response.status === 429) {
		throw new RateLimitedError()
	}
	return response.data
}
