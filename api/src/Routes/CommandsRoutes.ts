import Run4FISEventsScraperController from '@api/Controllers/Commands/Run4FISEventsScraperController'
import Run4FISFlickrEventsScraperController from '@api/Controllers/Commands/Run4FISFlickrEventsScraperController'
import RunInSISCatalogScraperController from '@api/Controllers/Commands/RunInSISCatalogScraperController'
import RunInSISStudyPlansScraperController from '@api/Controllers/Commands/RunInSISStudyPlansScraperController'
import CommandMiddleware from '@api/Middlewares/CommandMiddleware'
import { Router } from 'express'

const CommandsRoutes = Router()

CommandsRoutes.post('/4fis/events', CommandMiddleware, Run4FISEventsScraperController)

CommandsRoutes.post('/4fis/flickr_events', CommandMiddleware, Run4FISFlickrEventsScraperController)

CommandsRoutes.post('/insis/catalog', CommandMiddleware, RunInSISCatalogScraperController)

CommandsRoutes.post('/insis/study_plans', CommandMiddleware, RunInSISStudyPlansScraperController)

export default CommandsRoutes
