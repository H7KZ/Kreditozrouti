import EventController from '@api/Controllers/Events/EventController'
import EventsAllController from '@api/Controllers/Events/EventsAllController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { Router } from 'express'

/**
 * Router definition for Event-related endpoints.
 * All routes are protected by authentication middleware.
 *
 * @route /events
 */
const EventsRoutes = Router()

EventsRoutes.get('/', AuthMiddleware, LoggerMiddleware, EventsAllController)
EventsRoutes.get('/all', AuthMiddleware, LoggerMiddleware, EventsAllController)

EventsRoutes.get('/:id', AuthMiddleware, LoggerMiddleware, EventController)

export default EventsRoutes
