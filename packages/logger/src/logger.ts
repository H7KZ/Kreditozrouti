import pino from 'pino'

export function createLogger(options: { service: string; env: string }): pino.Logger {
  const isProduction = options.env === 'production' || options.env === 'prod'
  return pino({
    level: isProduction ? 'info' : 'debug',
    base: { service: options.service, env: options.env },
    formatters: {
      level: label => ({ level: label.toUpperCase() })
    },
    timestamp: pino.stdTimeFunctions.isoTime
  })
}

export function withJobLogger<T extends { id?: string; name?: string; attemptsMade?: number }>(
  queueName: string,
  handler: (job: T) => Promise<void>,
  parentLogger: pino.Logger
): (job: T) => Promise<void> {
  return async (job: T) => {
    const jobLog = parentLogger.child({
      context: 'job',
      queue: queueName,
      job_id: job.id ?? 'unknown',
      job_name: job.name ?? queueName,
      attempt: (job.attemptsMade ?? 0) + 1
    })
    const start = Date.now()
    try {
      await handler(job)
      jobLog.info({ duration_ms: Date.now() - start }, 'job.completed')
    } catch (error) {
      jobLog.error({ duration_ms: Date.now() - start, err: error }, 'job.failed')
      throw error
    }
  }
}
