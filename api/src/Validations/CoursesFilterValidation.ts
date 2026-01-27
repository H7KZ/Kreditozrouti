import { SemesterSchema, TimeSelectionSchema } from '@api/Validations/index'
import { InSISStudyPlanCourseCategoryValues } from '@scraper/Types/InSISStudyPlanCourseCategory'
import { InSISStudyPlanCourseGroupValues } from '@scraper/Types/InSISStudyPlanCourseGroup'
import * as z from 'zod'

const CoursesFilterValidation = z.object({
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
	languages: z.array(z.string()).optional(),

	// Time Filters
	include_times: z.array(TimeSelectionSchema).optional(),
	exclude_times: z.array(TimeSelectionSchema).optional(),

	// Personnel Filters
	lecturers: z.array(z.string()).optional(),

	// Study Plan Filters
	study_plan_ids: z.array(z.coerce.number()).optional(),
	groups: z.array(z.enum(InSISStudyPlanCourseGroupValues)).optional(),
	categories: z.array(z.enum(InSISStudyPlanCourseCategoryValues)).optional(),

	// Course Properties Filters
	ects: z.array(z.coerce.number()).optional(),
	mode_of_completions: z.array(z.string()).optional(),
	mode_of_deliveries: z.array(z.string()).optional(),

	// Availability Filters
	exclude_slot_ids: z.array(z.coerce.number()).optional(),

	// Sorting
	sort_by: z.enum(['ident', 'title', 'ects', 'faculty', 'year', 'semester']).optional().default('ident'),
	sort_dir: z.enum(['asc', 'desc']).optional().default('asc'),

	// Pagination
	limit: z.coerce.number().min(0).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0)
})

export default CoursesFilterValidation

export type CoursesFilter = z.infer<typeof CoursesFilterValidation>
