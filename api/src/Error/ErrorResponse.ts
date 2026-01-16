import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { $ZodIssue } from 'zod/v4/core'

interface APIErrorDetails {
	zodIssues?: $ZodIssue[]
	[key: string]: any
}

/**
 * Standardized response payload for failed API requests.
 * @route 4XX - 5XX
 */
export default interface ErrorResponse {
	type: ErrorTypeEnum
	code: ErrorCodeEnum
	message: string
	details: APIErrorDetails
}
