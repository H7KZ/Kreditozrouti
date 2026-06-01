import type { NextFunction, Request, Response } from 'express'
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client'

const register = new Registry()

collectDefaultMetrics({ register })

const httpDuration = new Histogram({
	name: 'http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'] as const,
	buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
	registers: [register],
})

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
	if (req.path === '/metrics') {
		return next()
	}
	const end = httpDuration.startTimer()
	res.on('finish', () => {
		end({
			method: req.method,
			route: req.route?.path ?? 'unknown',
			status_code: String(res.statusCode),
		})
	})
	next()
}

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
	res.set('Content-Type', register.contentType)
	res.send(await register.metrics())
}
