import '@api/types'
import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import ErrorHandler from '@api/Error/ErrorHandler'
import { Paths } from '@api/paths'
import AuthRoutes from '@api/Routes/AuthRoutes'
import EventRoutes from '@api/Routes/EventRoutes'
import EventsRoutes from '@api/Routes/EventsRoutes'
import compression from 'compression'
import { RedisStore } from 'connect-redis'
import cors, { CorsOptions } from 'cors'
import express from 'express'
import session, { type SessionOptions } from 'express-session'
import helmet from 'helmet'
import morgan from 'morgan'
import responseTime from 'response-time'

/**
 * Initializes the Express application instance.
 */
const app = express()

/**
 * Defines configuration settings for Cross-Origin Resource Sharing (CORS).
 * Specifies allowed origins and success status codes for legacy browser compatibility.
 */
const corsOptions: CorsOptions = {
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    origin: Config.allowedOrigins
}

/**
 * Serves static assets from the configured directory under the `/assets` path.
 */
app.use('/assets', express.static(Paths.assets))

/**
 * Enables pre-flight `OPTIONS` requests for all routes using the defined CORS settings.
 */
app.options('/{*any}', cors(corsOptions)) // include before other routes

/**
 * Applies global CORS middleware with credential support enabled.
 */
app.use(
    cors({
        ...corsOptions,
        credentials: true
    })
)

/**
 * Applies `helmet` middleware to set various HTTP security headers (e.g., DNS prefetch control, frameguard).
 */
app.use(helmet())

/**
 * Disables the `x-powered-by` header to obscure the underlying technology stack.
 */
app.disable('x-powered-by')

/**
 * Configures session management settings.
 * Uses Redis as the persistent store for session data.
 */
const sessionOptions: SessionOptions = {
    store: new RedisStore({ client: redis, prefix: 'session:' }),
    secret: Config.sessionSecret,
    resave: true,
    saveUninitialized: true,
    rolling: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}

/**
 * Enforces secure cookie policies (Secure, HttpOnly, Domain, SameSite) in non-development environments.
 */
if (!Config.isEnvDevelopment()) {
    app.set('trust proxy', 1)
    sessionOptions.cookie!.secure = true
    sessionOptions.cookie!.httpOnly = true
    sessionOptions.cookie!.domain = Config.domain
    sessionOptions.cookie!.sameSite = 'none' // Required for cross-site cookies
}

/**
 * Applies session management middleware to the application.
 */
app.use(session(sessionOptions))

/**
 * Enables Gzip compression for HTTP responses.
 */
app.use(compression({}))

/**
 * Configures HTTP request logging (verbose in dev, standard Apache combined format in prod)
 * and adds a `X-Response-Time` header to responses.
 */
app.use(morgan(Config.isEnvDevelopment() ? 'dev' : 'combined')) // Log different format on dev
app.use(responseTime())

/**
 * Mounts the API route handlers.
 */
app.use('/auth', AuthRoutes)
app.use('/events', EventsRoutes)
app.use('/event', EventRoutes)

/**
 * Registers the global error handling middleware to capture and format exceptions.
 */
app.use(ErrorHandler)

export default app
