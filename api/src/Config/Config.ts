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

    isEnvDevelopment: () => boolean
}

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
