import * as z from 'zod'

const stringOrArray = z.union([z.string(), z.array(z.string())]).optional()

const StudyPlansFilterValidation = z.object({
    ident: stringOrArray,
    faculty: stringOrArray,
    semester: stringOrArray,
    level: stringOrArray,
    mode_of_study: stringOrArray,
    study_length: stringOrArray,

    // Pagination
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    offset: z.coerce.number().min(0).optional().default(0)
})

export default StudyPlansFilterValidation
