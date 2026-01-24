import { SemesterSchema } from '@api/Validations/index'
import * as z from 'zod'

const StudyPlansFilterValidation = z.object({
	// Identity Filters
	ids: z.array(z.coerce.number()).optional(),
	idents: z.array(z.string()).optional(),
	title: z.string().optional(),

	// Academic Period Filters
	semesters: z.array(SemesterSchema).optional(),
	years: z.array(z.coerce.number()).optional(),

	// Organizational Filters
	faculty_ids: z.array(z.string()).optional(),
	levels: z.array(z.string()).optional(),
	mode_of_studies: z.array(z.string()).optional(),
	study_lengths: z.array(z.string()).optional(),

	// Course Filters (filter plans by courses they contain)
	has_course_ids: z.array(z.coerce.number()).optional(),
	has_course_idents: z.array(z.string()).optional(),

	// Sorting
	sort_by: z.enum(['ident', 'title', 'faculty_id', 'year', 'semester', 'level']).optional().default('ident'),
	sort_dir: z.enum(['asc', 'desc']).optional().default('asc'),

	// Pagination
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0)
})

export default StudyPlansFilterValidation

export type StudyPlansFilter = z.infer<typeof StudyPlansFilterValidation>
