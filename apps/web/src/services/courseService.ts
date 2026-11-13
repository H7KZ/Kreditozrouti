import type { CoursesFilter, CoursesResponseDTO, StudologStatsDTO, StudologStatsResponseDTO } from '@kreditozrouti/types'
import api, { quietApi } from '@web/api'

export async function fetchCourses(filters: Partial<CoursesFilter>): Promise<CoursesResponseDTO> {
	const response = await api.post<CoursesResponseDTO>('/courses', filters)
	return response.data
}

export async function fetchStudologStats(ident: string): Promise<StudologStatsDTO | null> {
	try {
		const response = await quietApi.get<StudologStatsResponseDTO>(`/courses/${encodeURIComponent(ident)}/studolog`)
		return response.data.stats
	} catch {
		return null
	}
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
			validateStatus: s => s === 202 || s === 429
		}
	)
	if (response.status === 429) {
		throw new RateLimitedError()
	}
	return response.data
}
