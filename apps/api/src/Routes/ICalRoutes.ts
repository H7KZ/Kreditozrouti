import { NextFunction, Request, Response, Router } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from '@api/clients'
import ICalCreateController from '@api/Controllers/ICal/ICalCreateController'
import ICalGetController from '@api/Controllers/ICal/ICalGetController'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'

const icalLimiter = new RateLimiterRedis({
	storeClient: redis,
	keyPrefix: 'ical:ip',
	points: 10,
	duration: 60 // 10 POST requests per IP per minute
})

async function icalRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		await icalLimiter.consume(req.ip ?? 'unknown')
		next()
	} catch {
		res.status(429).json({ type: 'RATE_LIMITED', code: '429000', message: 'Too many iCal requests. Please wait.' })
	}
}

const ICalRoutes = Router()

ICalRoutes.post('/', ParserJSONMiddleware, icalRateLimit, ICalCreateController)
ICalRoutes.get('/:id', ICalGetController)

export default ICalRoutes
