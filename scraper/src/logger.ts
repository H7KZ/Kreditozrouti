import pino from 'pino'
import Config from '@scraper/Config/Config'

/**
 * Root pino logger for the scraper package.
 * Every log line automatically carries { service: 'scraper', env: '...' }.
 * Level is 'debug' in development (log all) and 'info' in production (drop debug).
 */
export const logger = pino({
    level: Config.isEnvProduction() ? 'info' : 'debug',
    base: { service: 'scraper', env: Config.env },
    formatters: {
        level: label => ({ level: label.toUpperCase() })
    },
    timestamp: pino.stdTimeFunctions.isoTime
})
