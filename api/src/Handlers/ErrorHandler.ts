import { NextFunction, Request, Response } from 'express'
import { ApiError } from '@api/Errors'

/**
 * Global Express error handling middleware.
 * Intercepts exceptions and formats them into a standardized JSON response.
 * Handles custom `ApiError` types, standard `Error` objects, and unknown types.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ErrorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
	if (err instanceof ApiError) {
		res.status(err.status).json({
			type: err.type,
			message: err.message,
			details: err.details ?? {}
		})
		return
	}

	console.error(err)
	res.status(500).json({
		type: 'INTERNAL',
		message: err instanceof Error ? err.message : 'Internal server error',
		details: {}
	})
}

export default ErrorHandler
