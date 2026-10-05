import { timeToMinutes } from '@kreditozrouti/core/domain'
import * as z from 'zod'
import { DaySchema, SemesterSchema } from '@api/Validations'

/** Accepts `a,b` or repeated `?x=a&x=b` and yields a clean string array. */
function list<T extends z.ZodType>(item: T) {
	return z.preprocess(value => {
		const values = Array.isArray(value) ? value : value === undefined ? [] : [value]
		return values
			.flatMap(v => (typeof v === 'string' ? v.split(',') : [v]))
			.map(v => (typeof v === 'string' ? v.trim() : v))
			.filter(v => v !== '')
	}, z.array(item).max(50))
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM')

const pagination = {
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0)
}

/** Unknown query parameters are rejected, so a typo fails loudly instead of silently returning unfiltered data. */
export const CoursesQuerySchema = z
	.strictObject({
		year: z.coerce.number().int().min(2000).max(2100).optional(),
		semester: SemesterSchema.optional(),
		faculty: list(z.string().min(1).max(32)),
		level: list(z.string().min(1).max(64)),
		language: list(z.string().min(1).max(32)),
		ects_min: z.coerce.number().int().min(0).max(60).optional(),
		ects_max: z.coerce.number().int().min(0).max(60).optional(),
		lecturer_id: z.coerce.number().int().positive().optional(),
		study_plan_id: z.coerce.number().int().positive().optional(),
		q: z.string().trim().min(2).max(200).optional(),
		day: DaySchema.optional(),
		time_from: hhmm.optional(),
		time_to: hhmm.optional(),
		sort: z.enum(['ident', 'title', 'ects']).default('ident'),
		order: z.enum(['asc', 'desc']).default('asc'),
		...pagination
	})
	.refine(q => q.ects_min === undefined || q.ects_max === undefined || q.ects_min <= q.ects_max, {
		message: 'ects_min must not exceed ects_max',
		path: ['ects_min']
	})
	.refine(q => (q.time_from === undefined && q.time_to === undefined) || q.day !== undefined, { message: 'time_from and time_to need a day', path: ['day'] })
	.refine(q => (timeToMinutes(q.time_from ?? '00:00') ?? 0) < (timeToMinutes(q.time_to ?? '23:59') ?? 1439), {
		message: 'time_from must be before time_to',
		path: ['time_from']
	})

export type CoursesQuery = z.infer<typeof CoursesQuerySchema>

export const LecturersQuerySchema = z.strictObject({
	q: z.string().trim().min(2).max(100).optional(),
	...pagination
})

export type LecturersQuery = z.infer<typeof LecturersQuerySchema>

export const PeriodsQuerySchema = z.strictObject({
	year: z.coerce.number().int().min(2000).max(2100).optional(),
	semester: SemesterSchema.optional(),
	faculty: list(z.string().min(1).max(32))
})

export type PeriodsQuery = z.infer<typeof PeriodsQuerySchema>

export const StudyPlansQuerySchema = z.strictObject({
	year: z.coerce.number().int().min(2000).max(2100).optional(),
	semester: SemesterSchema.optional(),
	faculty: list(z.string().min(1).max(32)),
	level: list(z.string().min(1).max(64)),
	...pagination
})

export type StudyPlansQuery = z.infer<typeof StudyPlansQuerySchema>

export const IdParamSchema = z.strictObject({ id: z.coerce.number().int().positive() })

export const UsageQuerySchema = z.strictObject({
	days: z.coerce.number().int().min(1).max(31).default(7)
})
