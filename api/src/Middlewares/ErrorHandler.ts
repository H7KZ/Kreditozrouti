import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { Exception } from '@api/Interfaces/ErrorInterface'
import { NextFunction, Request, Response } from 'express'

// NextFunction is required here - otherwise Express won't recognize this as an error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ErrorHandler(error: Exception | Error | unknown, req: Request, res: Response, next: NextFunction) {
    console.log(error)
    console.log(req)

    if (error instanceof Exception) {
        return res.status(error.status).json({
            type: error.type,
            code: error.code,
            message: error.message,
            details: error.details
        })
    }

    if (error instanceof Error) {
        return res.status(500).json({
            type: ErrorTypeEnum.Unknown,
            code: ErrorCodeEnum.Unknown,
            message: error.message ?? 'Internal Server Error',
            details: {
                stack: error.stack
            }
        })
    }

    return res.status(500).json({
        type: ErrorTypeEnum.Unknown,
        code: ErrorCodeEnum.Unknown,
        message: 'Internal Server Error',
        details: {}
    })
}
