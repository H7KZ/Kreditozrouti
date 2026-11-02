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

// The limiter protects Studolog, so it sits behind the cache: cached answers cost a visitor nothing.
CoursesRoutes.get('/:ident/studolog', withCache(300), studologRateLimit, (req, res) => StudologController.stats(req, res))

CoursesRoutes.post('/:id/scrape', scraperRateLimit(), (req, res) => CourseScraperController.trigger(req, res))
CoursesRoutes.get('/:id/scrape/status', (req, res) => CourseScraperController.status(req, res))

export default CoursesRoutes
