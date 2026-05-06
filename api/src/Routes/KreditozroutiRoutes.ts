import CoursesController from '@api/Controllers/Kreditozrouti/CoursesController'
import StudyPlanCoursesController from '@api/Controllers/Kreditozrouti/StudyPlanCoursesController'
import StudyPlansController from '@api/Controllers/Kreditozrouti/StudyPlansController'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

/**
 * Router definition for Kreditožrouti (InSIS data) endpoints.
 * Provides public access to course catalogs, study plans, and timetable tools.
 *
 * @route /
 */
const KreditozroutiRoutes = Router()

KreditozroutiRoutes.post('/courses', ParserJSONMiddleware, LoggerMiddleware, CoursesController)

KreditozroutiRoutes.post('/study_plans', ParserJSONMiddleware, LoggerMiddleware, StudyPlansController)

KreditozroutiRoutes.post('/study_plans/courses', ParserJSONMiddleware, LoggerMiddleware, StudyPlanCoursesController)

export default KreditozroutiRoutes
