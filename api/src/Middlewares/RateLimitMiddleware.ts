import { redis } from '@api/clients'
import { NextFunction, Request, Response } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'

const ipLimiter = new RateLimiterRedis({
	storeClient: redis,
	keyPrefix: 'scrape:ip',
	points: 3,
	duration: 600
})

const courseLimiter = new RateLimiterRedis({
	storeClient: redis,
	keyPrefix: 'scrape:course',
	points: 1,
	duration: 600
})

export function scraperRateLimit() {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
		const ip = req.ip ?? 'unknown'

		try {
			await Promise.all([ipLimiter.consume(ip), courseLimiter.consume(courseId)])
			next()
		} catch {
			res.status(429).json({ type: 'RATE_LIMITED', message: 'Too many scrape requests. Please wait before trying again.' })
		}
	}
}
