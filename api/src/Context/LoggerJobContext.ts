import { createJobContext } from '@kreditozrouti/logger'
import { logger } from '@api/logger'

export type { JobWideEvent } from '@kreditozrouti/logger'
export default createJobContext(logger)
