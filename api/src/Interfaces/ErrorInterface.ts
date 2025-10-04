import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { $ZodIssue } from 'zod/v4/core'

export interface APIError extends Error {
    status: number
    code: ErrorCodeEnum
    type: ErrorTypeEnum
    details?: APIErrorDetails
}

interface APIErrorDetails {
    zodIssues?: $ZodIssue[]
    stack?: string
    [key: string]: any
}

export class Exception extends Error implements APIError {
    constructor(
        public status = 500,
        public type = ErrorTypeEnum.Unknown,
        public code = ErrorCodeEnum.Unknown,
        message: string,
        public details: APIErrorDetails = {}
    ) {
        super(message)

        this.details.stack = this.stack

        Object.setPrototypeOf(this, Exception.prototype)
    }
}
