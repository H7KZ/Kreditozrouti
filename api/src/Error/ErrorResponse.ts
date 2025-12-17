import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { $ZodIssue } from 'zod/v4/core'

/**
 * Defines optional metadata, debug information, and validation errors.
 */
interface APIErrorDetails {
    /** A collection of schema validation errors from Zod. */
    zodIssues?: $ZodIssue[]

    /** Allows for arbitrary custom properties to be attached to the error. */
    [key: string]: any
}

/**
 * Defines the standardized payload structure for failed API requests.
 * @route 4XX - 5XX
 */
export default interface ErrorResponse {
    /** The high-level categorization of the error. */
    type: ErrorTypeEnum

    /** The specific numeric identifier for the error condition. */
    code: ErrorCodeEnum

    /** A human-readable description of the error in English. */
    message: string

    /** Extended context, validation issues, or stack traces. */
    details: APIErrorDetails
}
