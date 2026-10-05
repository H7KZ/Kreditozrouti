import * as z from 'zod'
import { Errors } from '@api/Errors'

/** Parses request input against a schema; a failure becomes a 422 problem with the zod issues under `errors`. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
	const result = schema.safeParse(input)
	if (!result.success) throw Errors.unprocessable(result.error.issues)
	return result.data
}
