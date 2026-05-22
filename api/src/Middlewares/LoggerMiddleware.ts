import { NextFunction, Request, Response } from 'express'
import { redis } from '@api/clients'
import RequestContext from '@api/Context/RequestContext'
import LoggerAPIContext, { LoggerWideEvent } from '@api/Context/LoggerAPIContext'

export default function LoggerMiddleware(req: Request, res: Response, next: NextFunction) {
    const request_id = crypto.randomUUID()
    const startTime = process.hrtime()

    const wideEvent: LoggerWideEvent = {
        request_id,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV ?? 'local',
        service: 'kreditozrouti-api'
    }

    res.locals.wideEvent = wideEvent
    res.setHeader('X-Request-Id', request_id)

    RequestContext.run(() => {
        RequestContext.add({ request_id })

        res.on('finish', () => {
            const diff = process.hrtime(startTime)

            wideEvent.duration_ms = (diff[0] * 1e9 + diff[1]) / 1e6
            wideEvent.status_code = res.statusCode

            // Merge anything controllers added via LoggerAPIContext.add()
            Object.assign(wideEvent, RequestContext.get())

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
                const hour = new Date().toISOString().slice(0, 13)

                redis.hincrby('metrics:errors:hourly', `${hour}:${res.statusCode}`, 1).catch(noop)
                redis.expire('metrics:errors:hourly', 90_000).catch(noop)

                const entry = JSON.stringify({
                    request_id,
                    status: res.statusCode,
                    method: req.method,
                    path: req.path,
                    query: Object.keys(req.query).length > 0 ? req.query : undefined,
                    ip: req.ip,
                    duration_ms: Math.round(wideEvent.duration_ms ?? 0),
                    timestamp: wideEvent.timestamp
                })
                redis.lpush('metrics:errors:recent', entry).catch(noop)
                redis.ltrim('metrics:errors:recent', 0, 199).catch(noop)
                redis.expire('metrics:errors:recent', 86_400).catch(noop)
            }
        })

        next()
    }, { request_id })
}
