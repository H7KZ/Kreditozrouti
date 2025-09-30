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

    dragonfly: {
        uri: string
        password: string
    }

    isEnvDevelopment: () => boolean
}

const config: Config = {
    env: process.env.ENV ?? 'development',

    dragonfly: {
        uri: process.env.DRAGONFLY_URI ?? '',
        password: process.env.DRAGONFLY_PASSWORD ?? ''
    },

    isEnvDevelopment: () => config.env === 'development'
}

export default config
