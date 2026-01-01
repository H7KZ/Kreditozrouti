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

    /** Redis connection settings. */
    redis: {
        uri: string
        password: string | undefined
    }

    isEnvDevelopment: () => boolean
}

const config: Config = {
    env: process.env.ENV ?? 'development',

    redis: {
        uri: process.env.REDIS_URI ?? '',
        password: process.env.REDIS_PASSWORD
    },

    isEnvDevelopment: () => config.env === 'development'
}

export default config
