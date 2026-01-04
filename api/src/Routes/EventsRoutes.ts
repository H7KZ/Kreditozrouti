import EventController from '@api/Controllers/Events/EventController'
import EventsAllController from '@api/Controllers/Events/EventsAllController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { Router } from 'express'

/**
 * Router definition for Event-related endpoints.
 * All routes are protected by authentication middleware.
 *
 * @route /events
 */
const EventsRoutes = Router()

// GET / - Get all events (root handler for compatibility with frontend)
EventsRoutes.get('/', AuthMiddleware, EventsAllController)
EventsRoutes.get('/all', AuthMiddleware, EventsAllController)
// GET /:id - Get a specific event by ID
EventsRoutes.get('/:id', AuthMiddleware, EventController)

export default EventsRoutes
