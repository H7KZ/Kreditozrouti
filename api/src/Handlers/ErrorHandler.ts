import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import ErrorResponse from '@api/Error/ErrorResponse'
import Exception from '@api/Error/Exception'
import { NextFunction, Request, Response } from 'express'

/**
 * Global Express error handling middleware.
 * Intercepts exceptions and formats them into a standardized JSON response.
 * Handles custom `Exception` types, standard `Error` objects, and unknown types.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ErrorHandler(error: Exception | Error | unknown, req: Request, res: Response, next: NextFunction) {
	if (error instanceof Exception) {
		return res.status(error.status).json({
			type: error.type,
			code: error.code,
			message: error.message,
			details: error.details
		} as ErrorResponse)
	}

	if (error instanceof Error) {
		return res.status(500).json({
			type: ErrorTypeEnum.UNKNOWN,
			code: ErrorCodeEnum.UNKNOWN,
			message: error.message ?? 'Internal Server Error',
			details: {}
		} as ErrorResponse)
	}

	return res.status(500).json({
		type: ErrorTypeEnum.UNKNOWN,
		code: ErrorCodeEnum.UNKNOWN,
		message: 'Internal Server Error',
		details: {}
	} as ErrorResponse)
}
