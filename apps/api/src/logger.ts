import type { JobShape } from '@kreditozrouti/logger'
import { withJobLogger as _withJobLogger, createLogger } from '@kreditozrouti/logger'
import Config from '@api/Config/Config'

export const logger = createLogger({ service: 'api', env: Config.env })

export function withJobLogger<T extends JobShape>(queueName: string, handler: (job: T) => Promise<void>): (job: T) => Promise<void> {
	return _withJobLogger(queueName, handler, logger)
}
