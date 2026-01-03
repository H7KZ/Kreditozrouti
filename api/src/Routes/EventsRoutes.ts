import EventController from '@api/Controllers/Events/EventController'
import EventsAllController from '@api/Controllers/Events/EventsAllController'
import { EventService } from '@api/Services/EventService'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

/**
 * Router definition for Event-related endpoints.
 * All routes are protected by authentication middleware.
 *
 * @route /events
 */
const EventsRoutes = Router()

// Validation schemas
const getEventsQuerySchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
})

const createEventSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().nullable().optional(),
    datetime: z.string().datetime(),
    description: z.string().nullable().optional(),
    place: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    image_src: z.string().nullable().optional(),
    image_alt: z.string().nullable().optional(),
    registration_from: z.string().datetime().nullable().optional(),
    registration_url: z.string().nullable().optional(),
    substitute_url: z.string().nullable().optional()
})

// GET /events - Get events with optional date range filter
EventsRoutes.get('/', AuthMiddleware, async (req: Request, res: Response) => {
    const result = await getEventsQuerySchema.safeParseAsync(req.query)

    if (!result.success) {
        throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid query parameters', { zodIssues: result.error.issues })
    }

    const { startDate, endDate } = result.data

    let events
    if (startDate && endDate) {
        events = await EventService.getEventsByDateRange(new Date(startDate), new Date(endDate))
    } else {
        // If no date range provided, get recent/upcoming events (last 30 days to next 90 days)
        const start = new Date()
        start.setDate(start.getDate() - 30)
        const end = new Date()
        end.setDate(end.getDate() + 90)
        events = await EventService.getEventsByDateRange(start, end)
    }

    return res.status(200).json(events)
})

// POST /events - Create a new event
EventsRoutes.post('/', AuthMiddleware, async (req: Request, res: Response) => {
    const result = await createEventSchema.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid request body', { zodIssues: result.error.issues })
    }

    const eventData = {
        id: uuidv4(),
        ...result.data,
        datetime: result.data.datetime,
        registration_from: result.data.registration_from ?? null
    }

    const event = await EventService.createEvent(eventData)

    return res.status(201).json(event)
})

// PUT /events/:id - Update an event
EventsRoutes.put('/:id', AuthMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params
    const result = await createEventSchema.partial().safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid request body', { zodIssues: result.error.issues })
    }

    const event = await EventService.updateEvent(id, result.data)

    return res.status(200).json(event)
})

// DELETE /events/:id - Delete an event
EventsRoutes.delete('/:id', AuthMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params

    await EventService.deleteEvent(id)

    return res.status(204).send()
})

// Legacy routes
EventsRoutes.get('/all', AuthMiddleware, EventsAllController)
EventsRoutes.get('/:id', AuthMiddleware, EventController)

export default EventsRoutes
