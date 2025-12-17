import '@api/types'
import Config from '@api/Config/Config'
import ErrorHandler from '@api/Handlers/ErrorHandler'
import { Paths } from '@api/paths'
import AuthRoutes from '@api/Routes/AuthRoutes'
import EventsRoutes from '@api/Routes/EventsRoutes'
import KreditozroutiRoutes from '@api/Routes/KreditozroutiRoutes'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import responseTime from 'response-time'

// Initializes the Express application instance.
const app = express()

// Serves static assets from the configured directory under the `/assets` path.
app.use('/assets', express.static(Paths.assets))

// Defines configuration settings for Cross-Origin Resource Sharing (CORS).
// Specifies allowed origins and success status codes for legacy browser compatibility.
app.use(
    cors({
        optionsSuccessStatus: 200,
        maxAge: 86400, // Cache preflight requests for 24 hours to reduce latency
        origin: Config.allowedOrigins,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']
    })
)

// Applies `helmet` middleware to set various HTTP security headers (e.g., DNS prefetch control, frameguard).
app.use(helmet())

// Disables the `x-powered-by` header to obscure the underlying technology stack.
app.disable('x-powered-by')

// Enables Gzip compression for HTTP responses.
app.use(compression({}))

// Configures HTTP request logging (verbose in dev, standard Apache combined format in prod)
// and adds a `X-Response-Time` header to responses.
app.use(morgan(Config.isEnvDevelopment() ? 'dev' : 'combined')) // Log different format on dev
app.use(responseTime())

// Health check endpoint to verify that the server is operational.
app.use('/health', (req, res) => res.status(200).send('OK'))

// Mounts the API route handlers.
app.use('/kreditozrouti', KreditozroutiRoutes)
app.use('/auth', AuthRoutes)
app.use('/events', EventsRoutes)

// Registers the global error handling middleware to capture and format exceptions.
app.use(ErrorHandler)

export default app
