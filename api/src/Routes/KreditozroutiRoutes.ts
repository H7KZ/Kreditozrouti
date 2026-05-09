import CoursesController from '@api/Controllers/Kreditozrouti/CoursesController'
import StudyPlanCoursesController from '@api/Controllers/Kreditozrouti/StudyPlanCoursesController'
import StudyPlansController from '@api/Controllers/Kreditozrouti/StudyPlansController'
import { withCache } from '@api/Middlewares/CacheMiddleware'
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

KreditozroutiRoutes.post('/courses', ParserJSONMiddleware, LoggerMiddleware, withCache(300), CoursesController)

KreditozroutiRoutes.post('/study_plans', ParserJSONMiddleware, LoggerMiddleware, withCache(300), StudyPlansController)

KreditozroutiRoutes.post('/study_plans/courses', ParserJSONMiddleware, LoggerMiddleware, withCache(300), StudyPlanCoursesController)

export default KreditozroutiRoutes
