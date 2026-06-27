import '@api/types'
import type { SessionOptions } from 'express-session'
import compression from 'compression'
import { RedisStore } from 'connect-redis'
import cors, { CorsOptions } from 'cors'
import express from 'express'
import session from 'express-session'
import helmet from 'helmet'
import responseTime from 'response-time'
import { bullboardRouter } from '@api/bullboard'
import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import ErrorHandler from '@api/Handlers/ErrorHandler'
import { metricsHandler, metricsMiddleware } from '@api/metrics'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { Paths } from '@api/paths'
import AdminRoutes from '@api/Routes/AdminRoutes'
import CommandsRoutes from '@api/Routes/CommandsRoutes'
import CoursesRoutes from '@api/Routes/CoursesRoutes'
import ICalRoutes from '@api/Routes/ICalRoutes'
import ShareRoutes from '@api/Routes/ShareRoutes'
import StudyPlansRoutes from '@api/Routes/StudyPlansRoutes'

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

// Pre-instantiated helmet configs — avoid creating new instances per request.
// /bullboard disables CSP only; Bull Board's UI uses inline styles/scripts.
const standardHelmet = helmet()
const noCspHelmet = helmet({ contentSecurityPolicy: false })

app.use((req, res, next) => {
	if (req.originalUrl.startsWith('/bullboard')) {
		return noCspHelmet(req, res, next)
	}
	return standardHelmet(req, res, next)
})
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

	const cookies: session.CookieOptions = sessionOptions.cookie! as session.CookieOptions

	cookies.secure = true
	cookies.httpOnly = true
	cookies.domain = Config.domain
	cookies.sameSite = 'none'
}

app.use(session(sessionOptions))
app.use(compression({}))
app.use(LoggerMiddleware)

// Metrics
app.use(responseTime())
app.use(metricsMiddleware)

app.use('/health', (req, res) => res.status(200).send('OK'))
app.get('/metrics', (req, res) => {
	if (req.get('x-forwarded-for')) {
		return res.status(404).end()
	}
	return metricsHandler(req, res)
})

// Routes
app.use('/courses', CoursesRoutes)
app.use('/study_plans', StudyPlansRoutes)
app.use('/share', ShareRoutes)
app.use('/ical', ICalRoutes)
app.use('/commands', CommandsRoutes)
app.use('/admin', AdminRoutes)
app.use('/bullboard', bullboardRouter)

// Error Handling
app.use(ErrorHandler)

export default app
