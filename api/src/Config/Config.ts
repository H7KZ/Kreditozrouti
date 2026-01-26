import path from 'path'
import dotenv from 'dotenv'

// Attempt to load .env files from distribution, root, or package levels
export function LoadConfig() {
	try {
		dotenv.config({
			path: [path.resolve(process.cwd(), '../../../../.env'), path.resolve(process.cwd(), '../.env'), path.resolve(process.cwd(), '.env')]
		})
	} catch {
		console.warn('No .env file found')
	}
}

export function CheckRequiredEnvironmentVariables(config: Config) {
	const required = [config.redis.uri, config.mysql.uri]

	if (required.some(variable => !variable || variable.length === 0)) {
		throw new Error('One or more required environment variables are missing or empty.')
	}
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

	fileDestination: string

	sentry: {
		dsn: string | undefined
		release: string | undefined
	}

	google: {
		user: string
		appPassword: string
	}

	client: {
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

	isEmailEnabled: () => boolean
	isEnvProduction: () => boolean
	isEnvDevelopment: () => boolean
	isEnvLocal: () => boolean
}

const config: Config = {
	env: process.env.ENV ?? 'local',

	port: Number(process.env.API_PORT ?? 40080),
	uri: process.env.API_URI ?? `http://localhost:${Number(process.env.API_PORT ?? 40080)}`,
	domain: process.env.API_DOMAIN ?? 'localhost',
	allowedOrigins: (process.env.API_ALLOWED_ORIGINS ?? '').split(','),
	sessionSecret: process.env.API_SESSION_SECRET ?? 'local',
	commandToken: process.env.API_COMMAND_TOKEN,

	fileDestination: process.env.API_FILE_DESTINATION ?? 'uploads/',

	sentry: {
		dsn: process.env.SENTRY_DSN,
		release: process.env.SENTRY_RELEASE
	},

	google: {
		user: process.env.GOOGLE_USER ?? '',
		appPassword: process.env.GOOGLE_APP_PASSWORD ?? ''
	},

	client: {
		uri: process.env.CLIENT_URI ?? 'http://localhost:45173',
		createURL: (path: string) => `${config.client.uri}${path}`
	},

	redis: {
		uri: process.env.REDIS_URI ?? '',
		password: process.env.REDIS_PASSWORD
	},

	mysql: {
		uri: process.env.MYSQL_URI ?? ''
	},

	isEmailEnabled: () => config.google.user.length > 0 && config.google.appPassword.length > 0,
	isEnvProduction: () => config.env === 'production' || config.env === 'prod',
	isEnvDevelopment: () => config.env === 'development' || config.env === 'dev',
	isEnvLocal: () => config.env === 'local'
}

export default config
