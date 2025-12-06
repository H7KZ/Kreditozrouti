import EventsAllController from '@api/Controllers/Events/EventsAllController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { Router } from 'express'

/**
 * Defines the router for retrieving collections of events.
 * Handles bulk data fetching and search filtering.
 */
const EventsRoutes = Router()

EventsRoutes.get('/all', AuthMiddleware, EventsAllController)

export default EventsRoutes
