import path from 'path'
import dotenv from 'dotenv'

// Attempt to load .env files from distribution, root, or package levels
try {
    dotenv.config({
        path: [path.resolve(process.cwd(), '../../../../.env'), path.resolve(process.cwd(), '../.env'), path.resolve(process.cwd(), '.env')]
    })
} catch {
    console.warn('No .env file found, relying on environment variables.')
}

/**
 * Application configuration interface.
 */
interface Config {
    /** Current runtime environment (e.g., 'development', 'production'). */
    env: string

    /** Sentry error tracking settings. */
    sentry: {
        dsn: string
        release: string
    }

    /** Redis connection settings. */
    redis: {
        uri: string
        password: string | undefined
    }

    /** InSIS system URLs and settings. */
    insis: {
        baseDomain: string
        catalogUrl: string
        catalogExtendedSearchUrl: string
        studyPlansUrl: string
        defaultReferrer: string
    }

    isEnvLocal: () => boolean
    isEnvDevelopment: () => boolean
    isEnvProduction: () => boolean
}

const config: Config = {
    env: process.env.ENV ?? 'development',

    sentry: {
        dsn: process.env.SENTRY_DSN ?? '',
        release: process.env.SENTRY_RELEASE ?? ''
    },

    redis: {
        uri: process.env.REDIS_URI ?? '',
        password: process.env.REDIS_PASSWORD
    },

    insis: {
        baseDomain: 'https://insis.vse.cz',
        catalogUrl: 'https://insis.vse.cz/katalog/',
        catalogExtendedSearchUrl: 'https://insis.vse.cz/katalog/index.pl?jak=rozsirene',
        studyPlansUrl: 'https://insis.vse.cz/katalog/plany.pl?lang=cz',
        defaultReferrer: 'https://insis.vse.cz'
    },

    isEnvLocal: () => config.env === 'localhost' || config.env === 'local',
    isEnvDevelopment: () => config.env === 'dev' || config.env === 'development',
    isEnvProduction: () => config.env === 'production' || config.env === 'prod'
}

export default config
