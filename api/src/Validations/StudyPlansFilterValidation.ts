import * as z from 'zod'

const stringOrArray = z.union([z.string(), z.array(z.string())]).optional()
const numberOrArray = z.union([z.coerce.number(), z.array(z.coerce.number())]).optional()

/**
 * Zod validation schema for the Study Plans Search API.
 */
const StudyPlansFilterValidation = z.object({
	ident: stringOrArray,
	faculty: stringOrArray,
	semester: stringOrArray,
	year: numberOrArray,
	level: stringOrArray,
	mode_of_study: stringOrArray,
	study_length: stringOrArray,

	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0)
})

export default StudyPlansFilterValidation
