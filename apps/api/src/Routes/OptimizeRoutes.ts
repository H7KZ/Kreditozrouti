import { Router } from 'express'
import OptimizeController from '@api/Controllers/Optimize/OptimizeController'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { optimizeRateLimit } from '@api/Middlewares/RateLimitMiddleware'

/**
 * Router definition for the timetable optimizer endpoint.
 *
 * @route /optimize
 */
const OptimizeRoutes = Router()

OptimizeRoutes.post('/', ParserJSONMiddleware, optimizeRateLimit(), LoggerMiddleware, OptimizeController)

export default OptimizeRoutes
