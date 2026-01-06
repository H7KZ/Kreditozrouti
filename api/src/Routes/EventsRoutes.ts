import EventController from '@api/Controllers/Events/EventController'
import EventRegisterUserController from '@api/Controllers/Events/EventRegisterUserController'
import EventsAllController from '@api/Controllers/Events/EventsAllController'
import EventUnregisterUserController from '@api/Controllers/Events/EventUnregisterUserController'
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

EventsRoutes.post('/:id/register', LoggerMiddleware, AuthMiddleware, EventRegisterUserController)
EventsRoutes.delete('/:id/register', LoggerMiddleware, AuthMiddleware, EventUnregisterUserController)

export default EventsRoutes
