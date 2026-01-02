import * as z from 'zod'

const stringOrArray = z.union([z.string(), z.array(z.string())]).optional()

/**
 * Zod validation schema for the Course Search API.
 * Defines allowed filters and coerces string inputs for numeric/boolean fields.
 */
const CoursesFilterValidation = z.object({
    semester: stringOrArray,
    ident: stringOrArray,
    lecturer: stringOrArray,
    day: stringOrArray,
    language: stringOrArray,
    level: stringOrArray,
    faculty: stringOrArray,

    study_plan_id: z.coerce.number().optional(),

    time_from: z.coerce.number().optional(),
    time_to: z.coerce.number().optional(),

    limit: z.coerce.number().min(1).max(100).optional().default(20),
    offset: z.coerce.number().min(0).optional().default(0)
})

export default CoursesFilterValidation
