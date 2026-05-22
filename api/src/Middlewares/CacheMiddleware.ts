import { createHash } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { redis } from '@api/clients'

function buildCacheKey(req: Request): string {
	const body = JSON.stringify(req.body ?? {}, Object.keys(req.body ?? {}).sort())
	const hash = createHash('sha256').update(`${req.method}:${req.path}:${body}`).digest('hex')
	return `cache:${hash}`
}

export function withCache(ttl: number) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const key = buildCacheKey(req)

		try {
			const cached = await redis.get(key)
			if (cached) {
				res.json(JSON.parse(cached))
				return
			}
		} catch {
			// cache miss or redis error — proceed without cache
		}

		// Intercept res.json to save to cache
		const originalJson = res.json.bind(res)
		res.json = (body: unknown) => {
			if (res.statusCode >= 200 && res.statusCode < 300) {
				redis.set(key, JSON.stringify(body), 'EX', ttl).catch((_err: unknown) => void _err)
			}
			return originalJson(body)
		}

		next()
	}
}
