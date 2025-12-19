import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { $ZodIssue } from 'zod/v4/core'

export interface APIError extends Error {
    status: number
    code: ErrorCodeEnum
    type: ErrorTypeEnum
    details: APIErrorDetails
}

interface APIErrorDetails {
    zodIssues?: $ZodIssue[]
    [key: string]: any
}

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
