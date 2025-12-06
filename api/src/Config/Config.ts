import path from 'path'
import dotenv from 'dotenv'

/**
 * Attempts to load environment variables from resolved paths.
 * Checks distribution, root, and package-level locations.
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

    /** The port number the API server listens on. */
    port: number
    /** The full public URI of the API. */
    uri: string
    /** The top-level domain for cookie and session scoping. */
    domain: string
    /** A list of origins permitted for Cross-Origin Resource Sharing (CORS). */
    allowedOrigins: string[]
    /** The secret key used to sign session IDs. */
    sessionSecret: string
    /** The local directory path for storing uploaded files. */
    fileDestination: string

    /** Google service credentials. */
    google: {
        /** The Google account username or email. */
        user: string
        /** The Google application-specific password. */
        appPassword: string
    }

    /** Frontend application settings. */
    frontend: {
        /** The base URI of the frontend application. */
        uri: string

        /**
         * Constructs a full URL for a given frontend path.
         * @param path - The relative path to append to the frontend URI.
         * @returns The absolute URL string.
         */
        createURL: (path: string) => string
    }

    /** Redis database connection settings. */
    redis: {
        /** The connection URI for the Redis instance. */
        uri: string
        /** The password for Redis authentication. */
        password: string
    }

    /** MySQL database connection settings. */
    mysql: {
        /** The connection URI for the MySQL database. */
        uri: string
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

    port: Number(process.env.API_PORT ?? 40080),
    uri: process.env.API_URI ?? `http://localhost:${Number(process.env.API_PORT ?? 40080)}`,
    domain: process.env.API_DOMAIN ?? 'localhost',
    allowedOrigins: (process.env.API_ALLOWED_ORIGINS ?? '').split(','),
    sessionSecret: process.env.API_SESSION_SECRET ?? 'development',
    fileDestination: process.env.API_FILE_DESTINATION ?? 'uploads/',

    google: {
        user: process.env.GOOGLE_USER ?? '',
        appPassword: process.env.GOOGLE_APP_PASSWORD ?? ''
    },

    frontend: {
        uri: process.env.FRONTEND_URI ?? '',

        createURL: (path: string) => `${config.frontend.uri}${path}`
    },

    redis: {
        uri: process.env.REDIS_URI ?? '',
        password: process.env.REDIS_PASSWORD ?? ''
    },

    mysql: {
        uri: process.env.MYSQL_URI ?? ''
    },

    isEnvDevelopment: () => config.env === 'development'
}

export default config
