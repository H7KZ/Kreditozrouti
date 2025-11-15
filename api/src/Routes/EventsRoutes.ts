import EventsAllController from '@api/Controllers/Events/EventsAllController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { Router } from 'express'

const EventsRoutes = Router()

EventsRoutes.post('/all', AuthMiddleware, EventsAllController)

export default EventsRoutes
