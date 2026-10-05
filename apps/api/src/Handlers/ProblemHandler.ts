import { NextFunction, Request, Response } from 'express'
import { ApiError } from '@api/Errors'
import { logger } from '@api/logger'

const PROBLEM_TITLES: Record<string, string> = {
	UNAUTHORIZED: 'Unauthorized',
	FORBIDDEN: 'Forbidden',
	VALIDATION: 'Validation failed',
	NOT_FOUND: 'Not found',
	RATE_LIMITED: 'Too many requests',
	INTERNAL: 'Internal server error'
}

/** Problem type identifier. A URN, so it does not pretend to be a page that resolves; the catalogue is in docs/api/PUBLIC_API.md. */
export function problemType(type: string): string {
	return `urn:kreditozrouti:problem:${type.toLowerCase().replace(/_/g, '-')}`
}

/**
 * Error handler for the partner API. Renders every error as RFC 9457 `application/problem+json`.
 * Mounted on the `/v1` router only, so the internal routes keep their existing error shape.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProblemHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
	const request_id = typeof res.locals.wideEvent?.request_id === 'string' ? res.locals.wideEvent.request_id : undefined

	if (err instanceof ApiError) {
		res.status(err.status)
			.type('application/problem+json')
			.json({
				type: problemType(err.type),
				title: PROBLEM_TITLES[err.type] ?? err.type,
				status: err.status,
				detail: err.message,
				instance: req.originalUrl.split('?')[0],
				request_id,
				// Validation issues go under `errors`; other details (such as the rate limit window) are extension members.
				...(err.details?.issues ? { errors: err.details.issues } : (err.details ?? {}))
			})
		return
	}

	logger.error({ err }, 'express.unhandled_error')

	// Never echo internal error messages to a partner.
	res.status(500)
		.type('application/problem+json')
		.json({
			type: problemType('INTERNAL'),
			title: PROBLEM_TITLES.INTERNAL,
			status: 500,
			detail: 'Internal server error',
			instance: req.originalUrl.split('?')[0],
			request_id
		})
}

export default ProblemHandler
