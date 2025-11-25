import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { $ZodIssue } from 'zod/v4/core'

/**
 * Interface representing additional error details
 */
interface APIErrorDetails {
    /**
     * Array of Zod validation issues, if applicable
     *
     * @type {$ZodIssue[]}
     * @optional
     */
    zodIssues?: $ZodIssue[]

    /**
     * Stack trace of the error, if available
     *
     * @type {string}
     * @optional
     */
    stack?: string

    /**
     * Additional arbitrary details
     *
     * @type {any}
     * @optional
     */
    [key: string]: any
}

/**
 * Interface representing an error response
 *
 * @route 4XX - 5XX
 */
export default interface ErrorResponse {
    /**
     * Error type
     *
     * @type {string}
     * @enum {string} ErrorTypeEnum
     */
    type: ErrorTypeEnum

    /**
     * Error code
     *
     * @type {number}
     * @enum {number} ErrorCodeEnum
     */
    code: ErrorCodeEnum

    /**
     * Error message in english
     *
     * @type {string}
     */
    message: string

    /**
     * Additional error details
     *
     * @type {object}
     * @interface APIErrorDetails
     */
    details: APIErrorDetails
}
