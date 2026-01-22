import { createUnion, NumberOrArray, SemesterSchema, StringOrArray } from '@api/Validations/index'
import * as z from 'zod'

const StudyPlansFilterValidation = z.object({
	// Identity Filters
	id: NumberOrArray,
	ident: StringOrArray,
	title: z.string().optional(),

	// Academic Period Filters
	semester: createUnion(SemesterSchema),
	year: NumberOrArray,

	// Organizational Filters
	faculty_id: StringOrArray,
	level: StringOrArray,
	mode_of_study: StringOrArray,
	study_length: StringOrArray,

	// Course Filters (filter plans by courses they contain)
	has_course_id: NumberOrArray,
	has_course_ident: StringOrArray,

	// Sorting
	sort_by: z.enum(['ident', 'title', 'faculty_id', 'year', 'semester', 'level']).optional().default('ident'),
	sort_dir: z.enum(['asc', 'desc']).optional().default('asc'),

	// Pagination
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0)
})

export default StudyPlansFilterValidation

export type StudyPlansFilter = z.infer<typeof StudyPlansFilterValidation>
