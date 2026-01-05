import Run4FISArchiveEventsScraperController from '@api/Controllers/Commands/Run4FISArchiveEventsScraperController'
import Run4FISEventScraperController from '@api/Controllers/Commands/Run4FISEventScraperController'
import Run4FISEventsScraperController from '@api/Controllers/Commands/Run4FISEventsScraperController'
import Run4FISFlickrEventScraperController from '@api/Controllers/Commands/Run4FISFlickrEventScraperController'
import Run4FISFlickrEventsScraperController from '@api/Controllers/Commands/Run4FISFlickrEventsScraperController'
import RunInSISCatalogScraperController from '@api/Controllers/Commands/RunInSISCatalogScraperController'
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

CommandsRoutes.post('/4fis/events', CommandMiddleware, Run4FISEventsScraperController)
CommandsRoutes.post('/4fis/event', ParserJSONMiddleware, CommandMiddleware, Run4FISEventScraperController)

CommandsRoutes.post('/4fis/archive/events', CommandMiddleware, Run4FISArchiveEventsScraperController)

CommandsRoutes.post('/4fis/flickr/events', CommandMiddleware, Run4FISFlickrEventsScraperController)
CommandsRoutes.post('/4fis/flickr/event', ParserJSONMiddleware, CommandMiddleware, Run4FISFlickrEventScraperController)

CommandsRoutes.post('/insis/catalog', CommandMiddleware, RunInSISCatalogScraperController)
CommandsRoutes.post('/insis/studyplans', CommandMiddleware, RunInSISStudyPlansScraperController)

export default CommandsRoutes
