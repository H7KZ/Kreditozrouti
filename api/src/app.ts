import '@api/types'
import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import ErrorHandler from '@api/Handlers/ErrorHandler'
import { Paths } from '@api/paths'
import CommandsRoutes from '@api/Routes/CommandsRoutes'
import KreditozroutiRoutes from '@api/Routes/KreditozroutiRoutes'
import sentry from '@api/sentry'
import compression from 'compression'
import { RedisStore } from 'connect-redis'
import cors, { CorsOptions } from 'cors'
import express from 'express'
import session, { type SessionOptions } from 'express-session'
import helmet from 'helmet'
import morgan from 'morgan'
import responseTime from 'response-time'

const app = express()

// CORS Configuration
const corsOptions: CorsOptions = {
	optionsSuccessStatus: 200, // Support legacy browsers/devices
	origin: Config.allowedOrigins,
	credentials: true
}

app.use('/assets', express.static(Paths.assets))
app.options('/{*any}', cors(corsOptions))
app.use(cors(corsOptions))

app.use(helmet())
app.disable('x-powered-by')

/**
 * Session Configuration.
 */
const sessionOptions: SessionOptions = {
	store: new RedisStore({ client: redis, prefix: 'session:' }),
	secret: Config.sessionSecret,
	resave: false,
	saveUninitialized: false,
	rolling: true,
	cookie: {
		maxAge: 1000 * 60 * 60 * 24 // 1 day
	}
}

if (!Config.isEnvLocal()) {
	app.set('trust proxy', 1)
	sessionOptions.cookie!.secure = true
	sessionOptions.cookie!.httpOnly = true
	sessionOptions.cookie!.domain = Config.domain
	sessionOptions.cookie!.sameSite = 'none'
}

app.use(session(sessionOptions))
app.use(compression({}))

// Logging and Metrics
app.use(morgan(Config.isEnvLocal() ? 'dev' : 'combined'))
app.use(responseTime())

app.use('/health', (req, res) => res.status(200).send('OK'))

// Routes
app.use('/', KreditozroutiRoutes)
app.use('/commands', CommandsRoutes)

// Sentry Error Logging
if (sentry.isEnabled()) sentry.setupExpressErrorHandler(app)

// Error Handling
app.use(ErrorHandler)

export default app
