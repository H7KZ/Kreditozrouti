import path from 'path'
import dotenv from 'dotenv'
import fs from 'fs'

// Attempt to load .env files from distribution, root, or package levels
// Priority: .env first, then .env.mock as fallback
const envPaths = [
    // First try .env (real config)
    path.resolve(process.cwd(), '../../../../.env'),
    path.resolve(process.cwd(), '../../../.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '.env'),
    // Then try .env.mock (template/fallback)
    path.resolve(process.cwd(), '../../../../.env.mock'),
    path.resolve(process.cwd(), '../../../.env.mock'),
    path.resolve(process.cwd(), '../.env.mock'),
    path.resolve(process.cwd(), '.env.mock')
]

let envLoaded = false
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        const result = dotenv.config({ path: envPath })
        if (result.parsed) {
            console.log(`[dotenv] ✅ Loaded environment from: ${envPath}`)
            console.log(`[dotenv] Loaded ${Object.keys(result.parsed).length} variables`)
            console.log(`[dotenv] GOOGLE_USER from file: ${result.parsed.GOOGLE_USER || 'NOT SET'}`)
            console.log(`[dotenv] GOOGLE_APP_PASSWORD from file: ${result.parsed.GOOGLE_APP_PASSWORD ? 'SET (hidden)' : 'NOT SET'}`)
            envLoaded = true
            break
        }
    }
}

if (!envLoaded) {
    console.warn('[dotenv] ⚠️ No .env or .env.mock file found in expected locations')
    console.warn('[dotenv] Searched paths:', envPaths)
}

/**
 * Application configuration interface.
 */
interface Config {
    /** Current runtime environment (e.g., 'development', 'production'). */
    env: string
    port: number
    /** Full public URI of the API. */
    uri: string
    /** Top-level domain for cookie and session scoping. */
    domain: string
    allowedOrigins: string[]
    sessionSecret: string
    commandToken: string | undefined

    /** JWT signing key. */
    jwtSecret: Uint8Array<ArrayBuffer>
    jwtExpiration: string
    jwtExpirationSeconds: number
    jwtIssuer: string
    jwtAudience: string

    fileDestination: string

    google: {
        user: string
        appPassword: string
    }

    frontend: {
        uri: string
        createURL: (path: string) => string
    }

    redis: {
        uri: string
        password: string | undefined
    }

    mysql: {
        uri: string
    }

    isEnvDevelopment: () => boolean
}

const config: Config = {
    env: process.env.ENV ?? 'development',

    port: Number(process.env.API_PORT ?? 40080),
    uri: process.env.API_URI ?? `http://localhost:${Number(process.env.API_PORT ?? 40080)}`,
    domain: process.env.API_DOMAIN ?? 'localhost',
    allowedOrigins: (process.env.API_ALLOWED_ORIGINS ?? '').split(','),
    sessionSecret: process.env.API_SESSION_SECRET ?? 'development',
    commandToken: process.env.API_COMMAND_TOKEN,

    jwtSecret: new TextEncoder().encode(process.env.API_JWT_SECRET ?? 'development'),
    jwtExpiration: process.env.API_JWT_EXPIRATION ?? '7d',
    jwtExpirationSeconds: Number(process.env.API_JWT_EXPIRATION_SECONDS ?? 604800),
    jwtIssuer: process.env.API_JWT_ISSUER ?? 'diar:4fis:local',
    jwtAudience: process.env.API_JWT_AUDIENCE ?? 'diar:4fis:local:users',

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
        password: process.env.REDIS_PASSWORD
    },

    mysql: {
        uri: process.env.MYSQL_URI ?? ''
    },

    isEnvDevelopment: () => config.env === 'development'
}

// Validate critical configuration
if (!config.mysql.uri) {
    console.warn('[Config] WARNING: MYSQL_URI is not set! Database connections will fail.')
}
if (!config.redis.uri) {
    console.warn('[Config] WARNING: REDIS_URI is not set! Redis connections will fail.')
}
if (!config.google.user || !config.google.appPassword) {
    console.warn('[Config] WARNING: Google credentials not set! Emails will use test transport.')
    console.warn('[Config] GOOGLE_USER:', config.google.user || 'NOT SET')
    console.warn('[Config] GOOGLE_APP_PASSWORD:', config.google.appPassword ? 'SET' : 'NOT SET')
}

export default config
