import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import ErrorResponse from '@api/Error/ErrorResponse'
import Exception from '@api/Error/Exception'
import { NextFunction, Request, Response } from 'express'

/**
 * Global Express error handling middleware.
 * Intercepts exceptions, standard errors, and unknown objects to return a standardized JSON error response.
 *
 * @param error - The captured error object (custom Exception, standard Error, or unknown).
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function (required to register as error middleware).
 * @returns The HTTP response containing the formatted error details.
 */
// NextFunction is required here - otherwise Express won't recognize this as an error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ErrorHandler(error: Exception | Error | unknown, req: Request, res: Response, next: NextFunction) {
    // console.log(error)
    // console.log(req)

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
