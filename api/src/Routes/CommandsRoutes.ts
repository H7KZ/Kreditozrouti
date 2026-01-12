import RunInSISCatalogScraperController from '@api/Controllers/Commands/RunInSISCatalogScraperController'
import RunInSISStudyPlansScraperController from '@api/Controllers/Commands/RunInSISStudyPlansScraperController'
import CommandMiddleware from '@api/Middlewares/CommandMiddleware'
import { Router } from 'express'

/**
 * Router definition for System Commands and Scrapers.
 * Protected by a specialized Command Token middleware.
 *
 * @route /commands
 */
const CommandsRoutes = Router()

CommandsRoutes.post('/insis/catalog', CommandMiddleware, RunInSISCatalogScraperController)
CommandsRoutes.post('/insis/studyplans', CommandMiddleware, RunInSISStudyPlansScraperController)

export default CommandsRoutes
