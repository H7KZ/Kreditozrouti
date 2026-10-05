import { ZodIssue } from 'zod'

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly type: string,
		message: string,
		public readonly details?: Record<string, unknown>
	) {
		super(message)
		this.name = 'ApiError'
	}
}

export const Errors = {
	unauthorized: (msg = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', msg),

	validation: (issues: ZodIssue[], msg = 'Validation failed') => new ApiError(403, 'VALIDATION', msg, { issues }),

	forbidden: (msg = 'Forbidden') => new ApiError(403, 'FORBIDDEN', msg),

	/** 422, used by the partner API. Internal routes keep `validation` (403) for compatibility with the web app. */
	unprocessable: (issues: ZodIssue[], msg = 'Validation failed') => new ApiError(422, 'VALIDATION', msg, { issues }),

	rateLimited: (msg = 'Too many requests', details?: Record<string, unknown>) => new ApiError(429, 'RATE_LIMITED', msg, details),

	notFound: (msg = 'Not found') => new ApiError(404, 'NOT_FOUND', msg),

	internal: (msg = 'Internal server error') => new ApiError(500, 'INTERNAL', msg)
}
