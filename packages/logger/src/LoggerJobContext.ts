import { AsyncLocalStorage } from 'async_hooks'
import type pino from 'pino'

export interface JobWideEvent {
  job_id: string
  job_name: string
  queue_name: string
  attempt: number
  timestamp: string
  duration_ms?: number
  status?: 'success' | 'failed' | 'skipped' | 'dispatching_catalog'
  error_message?: string
  [key: string]: unknown
}

export function createJobContext(parentLogger: pino.Logger): {
  run(fn: () => Promise<void>, initialContext: Partial<JobWideEvent>): Promise<void>
  add(context: Partial<JobWideEvent>): void
  get(): Partial<JobWideEvent>
  log: pino.Logger
} {
  const storage = new AsyncLocalStorage<Map<string, unknown>>()
  return {
    run(fn, initialContext) {
      const store = new Map<string, unknown>(Object.entries(initialContext))
      return storage.run(store, fn)
    },
    add(context) {
      const store = storage.getStore()
      if (store) for (const [key, value] of Object.entries(context)) store.set(key, value)
    },
    get() {
      const store = storage.getStore()
      return store ? Object.fromEntries(store) : {}
    },
    log: parentLogger.child({ context: 'job' })
  }
}
