import { createLogger, withJobLogger as _withJobLogger } from '@kreditozrouti/logger'
import Config from '@api/Config/Config'

export const logger = createLogger({ service: 'api', env: Config.env })

// ponytail: wraps parentLogger so call sites keep the same 2-arg signature they use today
export function withJobLogger<T extends { id?: string; name?: string; attemptsMade?: number }>(
	queueName: string,
	handler: (job: T) => Promise<void>
): (job: T) => Promise<void> {
	return _withJobLogger(queueName, handler, logger)
}
