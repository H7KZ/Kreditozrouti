import Config from '@api/Config/Config'
import ErrorHandler from '@api/Error/ErrorHandler'
import { Paths } from '@api/paths'
import AuthRoutes from '@api/Routes/AuthRoutes'
import EventRoutes from '@api/Routes/EventRoutes'
import EventsRoutes from '@api/Routes/EventsRoutes'
import compression from 'compression'
import cors, { CorsOptions } from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import responseTime from 'response-time'

const app = express()

// Allowed development ports (for localhost development only)
const ALLOWED_DEV_PORTS = [45173] // Vite dev server default

const corsOptions: CorsOptions = {
    optionsSuccessStatus: 200,
    // Cache preflight requests for 24 hours to reduce latency
    maxAge: 86400,
    origin: (origin, callback) => {
        // Log for debugging
        if (Config.isEnvDevelopment()) {
            console.log(`[CORS] Request origin: ${origin}, Allowed origins:`, Config.allowedOrigins)
        }

        // Allow requests with no origin (like mobile apps or curl requests)
        // Also allow if origin is in allowedOrigins list
        if (!origin || Config.allowedOrigins.includes(origin)) {
            callback(null, true)
        } else if (Config.isEnvDevelopment() && origin?.startsWith('http://localhost:')) {
            // In development, allow specific localhost ports only
            try {
                const url = new URL(origin)
                const port = parseInt(url.port)
                if (ALLOWED_DEV_PORTS.includes(port)) {
                    callback(null, true)
                } else {
                    callback(new Error('Not allowed by CORS'))
                }
            } catch {
                callback(new Error('Not allowed by CORS'))
            }
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']
}

app.use('/assets', express.static(Paths.assets))


app.use(cors(corsOptions))

app.use(helmet())

app.disable('x-powered-by')



app.use(compression({}))

app.use(morgan(Config.isEnvDevelopment() ? 'dev' : 'combined')) // Log different format on dev
app.use(responseTime())

app.use('/auth', AuthRoutes)
app.use('/events', EventsRoutes)
app.use('/event', EventRoutes)

// Global error handler
app.use(ErrorHandler)

export default app
