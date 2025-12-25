import path from 'path'
import dotenv from 'dotenv'

/**
 * Attempts to load environment variables from multiple potential locations.
 * Checks distribution, monorepo root, and package-level paths.
 */
try {
    dotenv.config({
        path: [
            path.resolve(process.cwd(), '../../../../.env'), // For dist folder
            path.resolve(process.cwd(), '../.env'), // For monorepo root
            path.resolve(process.cwd(), '.env') // For monorepo package
        ]
    })
} catch {
    console.warn('No .env file found')
}

/**
 * Defines the structure for the application configuration.
 */
interface Config {
    /** The current runtime environment (e.g., 'development', 'production'). */
    env: string

    /** Redis connection settings. */
    redis: {
        /** The connection URI for the Redis instance. */
        uri: string
        /** The password for Redis authentication. */
        password: string | undefined
    }

    /**
     * Determines if the current environment is set to development.
     * @returns True if env is 'development', otherwise false.
     */
    isEnvDevelopment: () => boolean
}

/**
 * The singleton configuration object initialized with environment variables or default fallbacks.
 */
const config: Config = {
    env: process.env.ENV ?? 'development',

    redis: {
        uri: process.env.REDIS_URI ?? '',
        password: process.env.REDIS_PASSWORD
    },

    isEnvDevelopment: () => config.env === 'development'
}

export default config
