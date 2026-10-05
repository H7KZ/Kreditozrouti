import { Request, Response } from 'express'
import { Errors } from '@api/Errors'
import { hasScope } from '@api/Services/Partner/PartnerAuthService'
import { CatalogueV1Service } from '@api/Services/V1/CatalogueV1Service'
import { parseOrThrow } from './parse'
import { CoursesQuerySchema, IdParamSchema, LecturersQuerySchema, PeriodsQuerySchema, StudyPlansQuerySchema } from './schemas'

/** Lecturer data is personal data, so it is gated by its own scope on top of `catalogue:read`. */
function canSeeLecturers(req: Request): boolean {
	return !!req.partner && hasScope(req.partner, 'lecturers:read')
}

export const CatalogueV1Controller = {
	listCourses: async (req: Request, res: Response) => {
		const query = parseOrThrow(CoursesQuerySchema, req.query)

		// Filtering by lecturer reveals who teaches what, so it needs the same scope as seeing lecturers.
		if (query.lecturer_id !== undefined && !canSeeLecturers(req)) throw Errors.forbidden('Filtering by lecturer_id needs the lecturers:read scope')

		res.json(await CatalogueV1Service.listCourses(query, canSeeLecturers(req)))
	},

	getCourse: async (req: Request, res: Response) => {
		const { id } = parseOrThrow(IdParamSchema, req.params)

		const course = await CatalogueV1Service.getCourse(id, canSeeLecturers(req))
		if (!course) throw Errors.notFound('Course not found')

		res.json(course)
	},

	listLecturers: async (req: Request, res: Response) => {
		const query = parseOrThrow(LecturersQuerySchema, req.query)
		res.json(await CatalogueV1Service.listLecturers(query))
	},

	getLecturer: async (req: Request, res: Response) => {
		const { id } = parseOrThrow(IdParamSchema, req.params)

		const lecturer = await CatalogueV1Service.getLecturer(id)
		if (!lecturer) throw Errors.notFound('Lecturer not found')

		res.json(lecturer)
	},

	listFaculties: async (_req: Request, res: Response) => {
		res.json(await CatalogueV1Service.listFaculties())
	},

	listPeriods: async (req: Request, res: Response) => {
		const query = parseOrThrow(PeriodsQuerySchema, req.query)
		res.json(await CatalogueV1Service.listPeriods(query))
	},

	listStudyPlans: async (req: Request, res: Response) => {
		const query = parseOrThrow(StudyPlansQuerySchema, req.query)
		res.json(await CatalogueV1Service.listStudyPlans(query))
	},

	getStudyPlan: async (req: Request, res: Response) => {
		const { id } = parseOrThrow(IdParamSchema, req.params)

		const plan = await CatalogueV1Service.getStudyPlan(id)
		if (!plan) throw Errors.notFound('Study plan not found')

		res.json(plan)
	}
}
