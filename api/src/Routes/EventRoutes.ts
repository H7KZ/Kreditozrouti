import EventController from '@api/Controllers/Event/EventController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { Router } from 'express'

const EventRoutes = Router()

EventRoutes.post('/:id', AuthMiddleware, EventController)

export default EventRoutes
