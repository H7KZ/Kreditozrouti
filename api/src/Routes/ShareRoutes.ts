import { NextFunction, Request, Response, Router } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from '@api/clients'
import ShareCreateController from '@api/Controllers/Share/ShareCreateController'
import ShareGetController from '@api/Controllers/Share/ShareGetController'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'

const shareLimiter = new RateLimiterRedis({
	storeClient: redis,
	keyPrefix: 'share:ip',
	points: 10,
	duration: 60 // 10 POST requests per IP per minute
})

async function shareRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		await shareLimiter.consume(req.ip ?? 'unknown')
		next()
	} catch {
		res.status(429).json({ type: 'RATE_LIMITED', code: '429000', message: 'Too many share requests. Please wait.' })
	}
}

const ShareRoutes = Router()

ShareRoutes.post('/', ParserJSONMiddleware, shareRateLimit, ShareCreateController)
ShareRoutes.get('/:id', ShareGetController)

export default ShareRoutes
