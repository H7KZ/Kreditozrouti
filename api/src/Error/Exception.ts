import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { $ZodIssue } from 'zod/v4/core'

/**
 * Standardized API error structure.
 */
export interface APIError extends Error {
    /** HTTP status code. */
    status: number
    /** Application-specific error code. */
    code: ErrorCodeEnum
    /** High-level error category. */
    type: ErrorTypeEnum
    /** Additional context and validation details. */
    details: APIErrorDetails
}

interface APIErrorDetails {
    zodIssues?: $ZodIssue[]
    [key: string]: any
}

/**
 * Custom exception class for throwing standardized API errors.
 */
export default class Exception extends Error implements APIError {
    constructor(
        public status = 500,
        public type = ErrorTypeEnum.UNKNOWN,
        public code = ErrorCodeEnum.UNKNOWN,
        message: string,
        public details: APIErrorDetails = {}
    ) {
        super(message)

        Object.setPrototypeOf(this, Exception.prototype)
    }
}
