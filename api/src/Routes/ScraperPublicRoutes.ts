import { CourseScraperController } from '@api/Controllers/Scraper/CourseScraperController'
import { scraperRateLimit } from '@api/Middlewares/RateLimitMiddleware'
import { Router } from 'express'

const router = Router()

router.post('/courses/:id/scrape', scraperRateLimit(), (req, res, next) => CourseScraperController.trigger(req, res, next))
router.get('/courses/:id/scrape/status', (req, res, next) => CourseScraperController.status(req, res, next))

export { router as ScraperPublicRoutes }
