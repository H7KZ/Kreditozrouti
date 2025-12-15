import EventController from '@api/Controllers/Events/EventController'
import EventsAllController from '@api/Controllers/Events/EventsAllController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { Router } from 'express'

const EventsRoutes = Router()

EventsRoutes.get('/all', AuthMiddleware, EventsAllController)

EventsRoutes.get('/:id', AuthMiddleware, EventController)

export default EventsRoutes
