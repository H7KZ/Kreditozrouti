import { scraper } from '@api/bullmq'
import type { NextFunction, Request, Response } from 'express'
import { collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client'

const register = new Registry()

collectDefaultMetrics({ register })

const httpDuration = new Histogram({
	name: 'http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'] as const,
	buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
	registers: [register]
})

new Gauge({
	name: 'bullmq_queue_depth',
	help: 'BullMQ queue job count by queue and status',
	labelNames: ['queue', 'status'] as const,
	registers: [register],
	async collect() {
		const queues = [scraper.queue.request, scraper.queue.response]
		for (const queue of queues) {
			try {
				const counts: Record<string, number> = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed')
				for (const [status, count] of Object.entries(counts)) {
					this.labels(queue.name, status).set(count)
				}
			} catch {
				// queue not ready yet
			}
		}
	}
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
			status_code: String(res.statusCode)
		})
	})
	next()
}

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
	res.set('Content-Type', register.contentType)
	res.send(await register.metrics())
}
