import EventController from '@api/Controllers/Events/EventController';
import EventsAllController from '@api/Controllers/Events/EventsAllController'
import EventRegisterController from '@api/Controllers/Events/EventRegisterController'
import EventUnregisterController from '@api/Controllers/Events/EventUnregisterController';
import AuthMiddleware from '@api/Middlewares/AuthMiddleware';
import { Router } from 'express';


/**
 * Router definition for Event-related endpoints.
 * All routes are protected by authentication middleware.
 *
 * @route /events
 */
const EventsRoutes = Router()

EventsRoutes.get('/all', AuthMiddleware, EventsAllController)
EventsRoutes.get('/:id', AuthMiddleware, EventController)
EventsRoutes.get('/:id', AuthMiddleware, EventRegisterController)
EventsRoutes.get('/:id', AuthMiddleware, EventUnregisterController)

export default EventsRoutes
