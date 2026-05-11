import LoggerAPIContext, { LoggerWideEvent } from '@api/Context/LoggerAPIContext'
import { redis } from '@api/clients'
import { NextFunction, Request, Response } from 'express'

export default function LoggerMiddleware(req: Request, res: Response, next: NextFunction) {
	const startTime = process.hrtime()

	const wideEvent: LoggerWideEvent = {
		method: req.method,
		path: req.path,
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV ?? 'local',
		service: 'kreditozrouti-api'
	}

	res.locals.wideEvent = wideEvent

	res.on('finish', () => {
		const diff = process.hrtime(startTime)

		wideEvent.duration_ms = (diff[0] * 1e9 + diff[1]) / 1e6
		wideEvent.status_code = res.statusCode

		if (LoggerAPIContext.shouldLog(res)) {
			if (res.statusCode >= 500) {
				LoggerAPIContext.log.error(wideEvent)
			} else if (res.statusCode >= 400) {
				LoggerAPIContext.log.warn(wideEvent)
			} else {
				LoggerAPIContext.log.info(wideEvent)
			}
		}

		// Track error metrics in Redis — fire and forget
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
		const noop = (_e: unknown) => {}
		if (res.statusCode >= 400) {
			const hour = new Date().toISOString().slice(0, 13) // e.g. "2026-05-11T14"

			// Hourly bucket counter: hash key per hour:status
			redis.hincrby('metrics:errors:hourly', `${hour}:${res.statusCode}`, 1).catch(noop)
			redis.expire('metrics:errors:hourly', 90_000).catch(noop) // 25h TTL

			// Recent error log: list of last 200 errors with metadata
			const entry = JSON.stringify({
				status: res.statusCode,
				method: req.method,
				path: req.path,
				query: Object.keys(req.query).length > 0 ? req.query : undefined,
				ip: req.ip,
				duration_ms: Math.round(wideEvent.duration_ms ?? 0),
				timestamp: wideEvent.timestamp,
			})
			redis.lpush('metrics:errors:recent', entry).catch(noop)
			redis.ltrim('metrics:errors:recent', 0, 199).catch(noop)
			redis.expire('metrics:errors:recent', 86_400).catch(noop) // 24h TTL
		}
	})

	next()
}
