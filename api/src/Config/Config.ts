interface Config {
    env: string

    dragonfly: {
        uri: string
        password: string
    }

    google: {
        email: string
        clientId: string
        clientSecret: string
        refreshToken: string
    }

    client: {
        uri: string

        createURL: (path: string) => string
    }

    port: number
    uri: string
    domain: string
    allowedOrigins: string[]
    sessionSecret: string
    fileDestination: string

    isEnvDevelopment: () => boolean
}

const config: Config = {
    env: process.env.ENV ?? 'development',

    dragonfly: {
        uri: process.env.DRAGONFLY_URI ?? '',
        password: process.env.DRAGONFLY_PASSWORD ?? ''
    },

    google: {
        email: process.env.GOOGLE_EMAIL ?? '',
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? ''
    },

    client: {
        uri: process.env.CLIENT_URI ?? '',

        createURL: (path: string) => `${config.client.uri}${path}`
    },

    port: Number(process.env.API_PORT ?? 40080),
    uri: process.env.API_URI ?? `http://localhost:${Number(process.env.API_PORT ?? 40080)}`,
    domain: process.env.API_DOMAIN ?? 'localhost',
    allowedOrigins: (process.env.API_ALLOWED_ORIGINS ?? '').split(','),
    sessionSecret: process.env.API_SESSION_SECRET ?? 'development',
    fileDestination: process.env.API_FILE_DESTINATION ?? 'uploads/',

    isEnvDevelopment: () => config.env === 'development'
}

export default config
