import LoggerAPIContext, { LoggerWideEvent } from '@api/Context/LoggerAPIContext'
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
	})

	next()
}
