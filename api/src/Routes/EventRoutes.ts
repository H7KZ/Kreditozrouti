import EventController from '@api/Controllers/Event/EventController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { Router } from 'express'

/**
 * Defines the router for single event resource operations.
 * Routes requests based on dynamic event IDs.
 */
const EventRoutes = Router()

EventRoutes.get('/:id', AuthMiddleware, EventController)

export default EventRoutes
