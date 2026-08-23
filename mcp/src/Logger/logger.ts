import pino from 'pino'
import Config from '@mcp/Config/Config'

export const logger = pino({ level: Config.logLevel })
