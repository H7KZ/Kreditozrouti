import { Router } from 'express'
import ICalCreateController from '@api/Controllers/ICal/ICalCreateController'
import ICalGetController from '@api/Controllers/ICal/ICalGetController'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { icalRateLimit } from '@api/Middlewares/RateLimitMiddleware'

const ICalRoutes = Router()

ICalRoutes.post('/', ParserJSONMiddleware, icalRateLimit, ICalCreateController)
ICalRoutes.get('/:id', ICalGetController)

export default ICalRoutes
