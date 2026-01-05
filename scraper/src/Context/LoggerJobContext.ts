import { AsyncLocalStorage } from 'async_hooks'
import pino from 'pino'

export interface JobWideEvent {
    job_id: string
    job_name: string
    queue_name: string
    attempt: number
    timestamp: string

    duration_ms?: number
    status?: 'success' | 'failed' | 'skipped'
    error_message?: string

    [key: string]: unknown
}

const LoggerJobStorage = new AsyncLocalStorage<Map<string, unknown>>()

const LoggerJobContext = {
    run: (fn: () => Promise<void>, initialContext: Partial<JobWideEvent>) => {
        const store = new Map<string, unknown>(Object.entries(initialContext))
        return LoggerJobStorage.run(store, fn)
    },

    add: (context: Partial<JobWideEvent>) => {
        const store = LoggerJobStorage.getStore()
        if (store) {
            Object.entries(context).forEach(([key, value]) => store.set(key, value))
        }
    },

    get: (): Partial<JobWideEvent> => {
        const store = LoggerJobStorage.getStore()
        return store ? Object.fromEntries(store) : {}
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

export default LoggerJobContext
