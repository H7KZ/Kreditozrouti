import EventController from '@api/Controllers/Events/EventController';
import { EventsAllController } from '@api/Controllers/Events/EventsAllController'
import EventSignoutController from '@api/Controllers/Events/EventSignOutController'
import EventSignupController from '@api/Controllers/Events/EventSignUpController';
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
EventsRoutes.get('/:id', AuthMiddleware, EventSignupController)
EventsRoutes.get('/:id', AuthMiddleware, EventSignoutController)

export default EventsRoutes
