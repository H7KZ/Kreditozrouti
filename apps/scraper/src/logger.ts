import { createLogger } from '@kreditozrouti/logger'
import Config from '@scraper/Config/Config'

export const logger = createLogger({ service: 'scraper', env: Config.env })
