import pino from 'pino'
import { Config } from '@mcp/Config/Config.js'

export const logger = pino({ level: Config.logLevel })
