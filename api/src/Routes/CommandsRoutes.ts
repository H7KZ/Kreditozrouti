import RunInSISCatalogScraperController from '@api/Controllers/Commands/RunInSISCatalogScraperController'
import RunInSISCourseScraperController from '@api/Controllers/Commands/RunInSISCourseScraperController'
import RunInSISStudyPlanScraperController from '@api/Controllers/Commands/RunInSISStudyPlanScraperController'
import RunInSISStudyPlansScraperController from '@api/Controllers/Commands/RunInSISStudyPlansScraperController'
import CommandMiddleware from '@api/Middlewares/CommandMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

/**
 * Router definition for System Commands and Scrapers.
 * Protected by a specialized Command Token middleware.
 *
 * @route /commands
 */
const CommandsRoutes = Router()

CommandsRoutes.post('/insis/catalog', ParserJSONMiddleware, CommandMiddleware, RunInSISCatalogScraperController)
CommandsRoutes.post('/insis/course', ParserJSONMiddleware, CommandMiddleware, RunInSISCourseScraperController)

CommandsRoutes.post('/insis/studyplans', ParserJSONMiddleware, CommandMiddleware, RunInSISStudyPlansScraperController)
CommandsRoutes.post('/insis/studyplan', ParserJSONMiddleware, CommandMiddleware, RunInSISStudyPlanScraperController)

export default CommandsRoutes
