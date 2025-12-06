import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { $ZodIssue } from 'zod/v4/core'

/**
 * Defines the structure of a standardized API error.
 * Extends the native JavaScript Error interface with HTTP and internal status codes.
 */
export interface APIError extends Error {
    /** HTTP status code (e.g., 400, 404, 500). */
    status: number
    /** Internal application-specific error code. */
    code: ErrorCodeEnum
    /** Categorization of the error type. */
    type: ErrorTypeEnum
    /** Extended error context and payload. */
    details: APIErrorDetails
}

/**
 * Container for additional error context, debugging information, and validation issues.
 */
interface APIErrorDetails {
    /** Validation issues returned by Zod, if applicable. */
    zodIssues?: $ZodIssue[]
    /** Stack trace string for debugging. */
    stack?: string
    /** Arbitrary additional context. */
    [key: string]: any
}

/**
 * Custom error class used to throw standardized exceptions.
 * Ensures consistent error response structure across the application.
 */
export default class Exception extends Error implements APIError {
    /**
     * Initializes a new Exception instance.
     *
     * @param status - HTTP status code (default: 500).
     * @param type - High-level error category (default: UNKNOWN).
     * @param code - Specific numeric error identifier (default: UNKNOWN).
     * @param message - Human-readable error description.
     * @param details - Additional context or validation data (default: {}).
     */
    constructor(
        public status = 500,
        public type = ErrorTypeEnum.UNKNOWN,
        public code = ErrorCodeEnum.UNKNOWN,
        message: string,
        public details: APIErrorDetails = {}
    ) {
        super(message)

        /**
         * Captures the stack trace into the details object for downstream logging.
         */
        this.details.stack = this.stack

        /**
         * Restores the prototype chain to ensure `instanceof Exception` checks work correctly.
         */
        Object.setPrototypeOf(this, Exception.prototype)
    }
}
