import { Response } from 'express'
import pino from 'pino'

export interface LoggerWideEvent {
    method: string
    path: string

    timestamp: string
    environment: string
    service: string

    duration_ms?: number
    status_code?: number

    user_id?: number

    [key: string]: unknown
}

const LoggerAPIContext = {
    add: (res: Response, context: Partial<LoggerWideEvent>) => {
        if (!res.locals.wideEvent) return

        res.locals.wideEvent = {
            ...res.locals.wideEvent,
            ...context
        }
    },

    shouldLog: (res: Response): boolean => {
        const event: LoggerWideEvent = res.locals.wideEvent
        if (!event) return false

        if ((event.status_code ?? 200) >= 400) return true
        if ((event.duration_ms ?? 0) > 1000) return true

        return Math.random() < 0.1
    },

    log: pino({
        formatters: {
            level: label => {
                return { level: label.toUpperCase() }
            }
        },
        timestamp: pino.stdTimeFunctions.isoTime
    })
}

export default LoggerAPIContext
