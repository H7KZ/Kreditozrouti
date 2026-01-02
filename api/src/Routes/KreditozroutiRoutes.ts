import CoursesController from '@api/Controllers/Kreditozrouti/CoursesController'
import StudyPlansController from '@api/Controllers/Kreditozrouti/StudyPlansController'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

/**
 * Router definition for Kreditožrouti (InSIS data) endpoints.
 * Provides public access to course catalogs and study plans.
 *
 * @route /kreditozrouti
 */
const KreditozroutiRoutes = Router()

KreditozroutiRoutes.post('/courses', ParserJSONMiddleware, CoursesController)
KreditozroutiRoutes.post('/study_plans', ParserJSONMiddleware, StudyPlansController)

export default KreditozroutiRoutes
