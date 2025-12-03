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

const app = express()

const corsOptions: CorsOptions = {
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    origin: Config.allowedOrigins
}

app.use('/assets', express.static(Paths.assets))

app.options('/{*any}', cors(corsOptions)) // include before other routes

app.use(
    cors({
        ...corsOptions,
        credentials: true
    })
)

app.use(helmet())

app.disable('x-powered-by')

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

if (!Config.isEnvDevelopment()) {
    app.set('trust proxy', 1)
    sessionOptions.cookie!.secure = true
    sessionOptions.cookie!.httpOnly = true
    sessionOptions.cookie!.domain = Config.domain
    sessionOptions.cookie!.sameSite = 'none' // Required for cross-site cookies
}

app.use(session(sessionOptions))

app.use(compression({}))

app.use(morgan(Config.isEnvDevelopment() ? 'dev' : 'combined')) // Log different format on dev
app.use(responseTime())

app.use('/auth', AuthRoutes)
app.use('/events', EventsRoutes)
app.use('/event', EventRoutes)

// Global error handler
app.use(ErrorHandler)

export default app
