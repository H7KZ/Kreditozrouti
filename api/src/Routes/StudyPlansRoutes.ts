import { Router } from 'express'
import StudyPlanCoursesController from '@api/Controllers/StudyPlans/StudyPlanCoursesController'
import StudyPlansController from '@api/Controllers/StudyPlans/StudyPlansController'
import { withCache } from '@api/Middlewares/CacheMiddleware'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'

/**
 * Router definition for study plan endpoints.
 *
 * @route /study_plans
 */
const StudyPlansRoutes = Router()

StudyPlansRoutes.post('/', ParserJSONMiddleware, LoggerMiddleware, withCache(300), StudyPlansController)

StudyPlansRoutes.post('/courses', ParserJSONMiddleware, LoggerMiddleware, withCache(300), StudyPlanCoursesController)

export default StudyPlansRoutes
