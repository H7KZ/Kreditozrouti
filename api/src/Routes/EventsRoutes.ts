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

EventsRoutes.get('/', LoggerMiddleware, AuthMiddleware, EventsAllController)
EventsRoutes.get('/all', LoggerMiddleware, AuthMiddleware, EventsAllController)

EventsRoutes.get('/:id', LoggerMiddleware, AuthMiddleware, EventController)

export default EventsRoutes
