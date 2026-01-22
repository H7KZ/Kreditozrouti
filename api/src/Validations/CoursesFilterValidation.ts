import { createUnion, DaySchema, NumberOrArray, SemesterSchema, StringOrArray, TimeSelectionSchema } from '@api/Validations/index'
import { InSISStudyPlanCourseCategoryValues } from '@scraper/Types/InSISStudyPlanCourseCategory'
import { InSISStudyPlanCourseGroupValues } from '@scraper/Types/InSISStudyPlanCourseGroup'
import * as z from 'zod'

const CoursesFilterValidation = z.object({
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
	language: StringOrArray,

	// Schedule Filters
	day: createUnion(DaySchema),
	time_from: z.coerce.number().optional(),
	time_to: z.coerce.number().optional(),

	// Personnel Filters
	lecturer: StringOrArray,

	// Study Plan Filters
	study_plan_id: NumberOrArray,
	group: createUnion(z.enum(InSISStudyPlanCourseGroupValues)),
	category: createUnion(z.enum(InSISStudyPlanCourseCategoryValues)),

	// Course Properties Filters
	ects: NumberOrArray,
	mode_of_completion: StringOrArray,
	mode_of_delivery: StringOrArray,

	// Availability Filters
	has_capacity: z.coerce.boolean().optional(),
	exclude_slot_ids: z.array(z.coerce.number()).optional(),
	exclude_times: z.array(TimeSelectionSchema).optional(),

	// Sorting
	sort_by: z.enum(['ident', 'title', 'ects', 'faculty', 'year', 'semester']).optional().default('ident'),
	sort_dir: z.enum(['asc', 'desc']).optional().default('asc'),

	// Pagination
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	offset: z.coerce.number().min(0).optional().default(0)
})

export default CoursesFilterValidation

export type CoursesFilter = z.infer<typeof CoursesFilterValidation>
