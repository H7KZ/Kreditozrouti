import { Router } from 'express'
import RunInSISCatalogScraperController from '@api/Controllers/Commands/RunInSISCatalogScraperController'
import RunInSISCourseScraperController from '@api/Controllers/Commands/RunInSISCourseScraperController'
import RunInSISStudyPlanScraperController from '@api/Controllers/Commands/RunInSISStudyPlanScraperController'
import RunInSISStudyPlansScraperController from '@api/Controllers/Commands/RunInSISStudyPlansScraperController'
import CommandMiddleware from '@api/Middlewares/CommandMiddleware'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'

/**
 * Router definition for System Commands and Scrapers.
 * Protected by a specialized Command Token middleware.
 *
 * @route /commands
 */
const CommandsRoutes = Router()

CommandsRoutes.post('/insis/catalog', ParserJSONMiddleware, CommandMiddleware, LoggerMiddleware, RunInSISCatalogScraperController)
CommandsRoutes.post('/insis/course', ParserJSONMiddleware, CommandMiddleware, LoggerMiddleware, RunInSISCourseScraperController)

CommandsRoutes.post('/insis/studyplans', ParserJSONMiddleware, CommandMiddleware, LoggerMiddleware, RunInSISStudyPlansScraperController)
CommandsRoutes.post('/insis/studyplan', ParserJSONMiddleware, CommandMiddleware, LoggerMiddleware, RunInSISStudyPlanScraperController)

export default CommandsRoutes
