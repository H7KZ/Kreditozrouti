import pino from 'pino'
import Config from '@api/Config/Config'

/**
 * Root pino logger for the API package.
 * Every log line automatically carries { service: 'api', env: '...' }.
 * Level is 'debug' in development (log all) and 'info' in production (drop debug).
 * Child loggers add { context: 'http' | 'job' } for stream-label extraction in Loki.
 */
export const logger = pino({
	level: Config.isEnvProduction() ? 'info' : 'debug',
	base: { service: 'api', env: Config.env },
	formatters: {
		level: label => ({ level: label.toUpperCase() })
	},
	timestamp: pino.stdTimeFunctions.isoTime,
})

/**
 * Wraps a BullMQ job handler with structured lifecycle logging.
 * Logs job.completed or job.failed with duration_ms and job metadata.
 * Replaces withSentryJobHandler — drop-in replacement for the Worker second argument.
 */
export function withJobLogger<T extends { id?: string; name?: string; attemptsMade?: number }>(
	queueName: string,
	handler: (job: T) => Promise<void>
): (job: T) => Promise<void> {
	return async (job: T) => {
		const jobLog = logger.child({
			context: 'job',
			queue: queueName,
			job_id: job.id ?? 'unknown',
			job_name: job.name ?? queueName,
			attempt: job.attemptsMade ?? 0,
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
