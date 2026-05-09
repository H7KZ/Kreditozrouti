import { CourseScraperController } from '@api/Controllers/Scraper/CourseScraperController'
import { scraperRateLimit } from '@api/Middlewares/RateLimitMiddleware'
import { Router } from 'express'

const router = Router()

router.post('/courses/:id/scrape', scraperRateLimit(), (req, res) => CourseScraperController.trigger(req, res))
router.get('/courses/:id/scrape/status', (req, res) => CourseScraperController.status(req, res))

export { router as ScraperPublicRoutes }
