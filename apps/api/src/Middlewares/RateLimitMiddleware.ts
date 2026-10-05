import { NextFunction, Request, Response } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from '@api/clients'

/**
 * Per-IP limits for the internal (web app) routes. The partner API does not use this: it limits per consumer
 * in `PartnerAuthMiddleware` and fails open, whereas these fail closed (a Redis error answers 429).
 */
interface IpRateLimitPolicy {
	keyPrefix: string
	points: number
	/** Window in seconds. */
	duration: number
	message: string
	/** Extra numeric code some clients already match on. */
	code?: string
}

function send429(res: Response, message: string, code?: string): void {
	res.status(429).json({ type: 'RATE_LIMITED', ...(code ? { code } : {}), message })
}

export function ipRateLimit(policy: IpRateLimitPolicy) {
	const limiter = new RateLimiterRedis({ storeClient: redis, keyPrefix: policy.keyPrefix, points: policy.points, duration: policy.duration })

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			await limiter.consume(req.ip ?? 'unknown')
			next()
		} catch {
			send429(res, policy.message, policy.code)
		}
	}
}

export const icalRateLimit = ipRateLimit({
	keyPrefix: 'ical:ip',
	points: 10,
	duration: 60,
	code: '429000',
	message: 'Too many iCal requests. Please wait.'
})

export const shareRateLimit = ipRateLimit({
	keyPrefix: 'share:ip',
	points: 10,
	duration: 60,
	code: '429000',
	message: 'Too many share requests. Please wait.'
})

export function optimizeRateLimit() {
	return ipRateLimit({
		keyPrefix: 'optimize:ip',
		points: 50,
		duration: 600,
		message: 'Too many optimize requests. Please wait before trying again.'
	})
}

const scrapeMessage = 'Too many scrape requests. Please wait before trying again.'

const scrapeIpLimiter = new RateLimiterRedis({ storeClient: redis, keyPrefix: 'scrape:ip', points: 3, duration: 600 })
const scrapeCourseLimiter = new RateLimiterRedis({ storeClient: redis, keyPrefix: 'scrape:course', points: 1, duration: 600 })

/** Scrape triggers are limited per IP and per course, both must have budget. */
export function scraperRateLimit() {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const courseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
		const ip = req.ip ?? 'unknown'

		try {
			await Promise.all([scrapeIpLimiter.consume(ip), scrapeCourseLimiter.consume(courseId)])
			next()
		} catch {
			send429(res, scrapeMessage)
		}
	}
}
