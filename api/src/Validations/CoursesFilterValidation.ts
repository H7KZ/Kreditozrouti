import * as z from 'zod'

const stringOrArray = z.union([z.string(), z.array(z.string())]).optional()

const CoursesFilterValidation = z.object({
    semester: stringOrArray,
    ident: stringOrArray,
    lecturer: stringOrArray,
    day: stringOrArray,
    language: stringOrArray,
    level: stringOrArray,
    faculty: stringOrArray,

    // Time filters (in minutes from midnight)
    time_from: z.coerce.number().optional(),
    time_to: z.coerce.number().optional(),

    // Pagination
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    offset: z.coerce.number().min(0).optional().default(0)
})

export default CoursesFilterValidation
