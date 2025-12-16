import path from 'path'
import dotenv from 'dotenv'

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

interface Config {
    env: string

    port: number
    uri: string
    domain: string
    allowedOrigins: string[]
    sessionSecret: string
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
        password: string
    }

    mysql: {
        uri: string
    }

    jwt: {
        secret: string
        accessTokenExpiration: string
        accessTokenExpirationSeconds: number
        refreshTokenExpiration: string
        refreshTokenExpirationSeconds: number
        issuer: string
        audience: string
    }

    isEnvDevelopment: () => boolean
}

const config: Config = {
    env: process.env.ENV ?? 'development',

    port: Number(process.env.API_PORT ?? 40080),
    uri: process.env.API_URI ?? `http://localhost:${Number(process.env.API_PORT ?? 40080)}`,
    domain: process.env.API_DOMAIN ?? 'localhost',
    allowedOrigins: (process.env.API_ALLOWED_ORIGINS ?? 'http://localhost:45173').split(',').map(origin => origin.trim()),
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

    jwt: {
        secret: process.env.API_JWT_SECRET ?? 'development-secret-change-in-production',
        accessTokenExpiration: process.env.API_JWT_ACCESS_EXPIRATION ?? '15m',
        accessTokenExpirationSeconds: Number(process.env.API_JWT_ACCESS_EXPIRATION_SECONDS ?? 900), // 15 minutes
        refreshTokenExpiration: process.env.API_JWT_REFRESH_EXPIRATION ?? '7d',
        refreshTokenExpirationSeconds: Number(process.env.API_JWT_REFRESH_EXPIRATION_SECONDS ?? 604800), // 7 days
        issuer: process.env.API_JWT_ISSUER ?? 'diar:4fis:local',
        audience: process.env.API_JWT_AUDIENCE ?? 'diar:4fis:local:users'
    },

    isEnvDevelopment: () => config.env === 'development'
}

export default config
