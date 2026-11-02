import { Router } from 'express'
import CoursesController from '@api/Controllers/Courses/CoursesController'
import { StudologController } from '@api/Controllers/Courses/StudologController'
import { CourseScraperController } from '@api/Controllers/Scraper/CourseScraperController'
import { withCache } from '@api/Middlewares/CacheMiddleware'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { scraperRateLimit, studologRateLimit } from '@api/Middlewares/RateLimitMiddleware'

/**
 * Router definition for course endpoints.
 *
 * @route /courses
 */
const CoursesRoutes = Router()

CoursesRoutes.post('/', ParserJSONMiddleware, LoggerMiddleware, withCache(300), CoursesController)

CoursesRoutes.get('/:ident/studolog', studologRateLimit, withCache(300), (req, res) => StudologController.stats(req, res))

CoursesRoutes.post('/:id/scrape', scraperRateLimit(), (req, res) => CourseScraperController.trigger(req, res))
CoursesRoutes.get('/:id/scrape/status', (req, res) => CourseScraperController.status(req, res))

export default CoursesRoutes
