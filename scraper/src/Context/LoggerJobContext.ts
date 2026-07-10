import { createJobContext } from '@kreditozrouti/logger'
import { logger } from '@scraper/logger'

export type { JobWideEvent } from '@kreditozrouti/logger'
export default createJobContext(logger)
