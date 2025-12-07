import { mysql } from '@api/clients'
import EventsAllRequest from '@api/Controllers/Events/types/EventsAllRequest'
import EventsAllResponse from '@api/Controllers/Events/types/EventsAllResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import EventsAllValidation from '@api/Validations/EventsAllValidation'
import { Request, Response } from 'express'

export default async function EventsAllController(req: Request, res: Response) {
    const result = await EventsAllValidation.safeParseAsync(req.query)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
    }

    const data = result.data as EventsAllRequest

    const eventsQuery = mysql.selectFrom('events').selectAll()

    if (data.title) {
        eventsQuery.where('events.title', 'like', `%${data.title}%`)
    }

    if (data.date_from) {
        eventsQuery.where('events.datetime', '>=', data.date_from)
    }

    if (data.date_to) {
        eventsQuery.where('events.datetime', '<=', data.date_to)
    }

    if (data.categories && data.categories.length > 0) {
        eventsQuery.innerJoin('events_categories', join =>
            join.onRef('events.id', '=', 'events_categories.event_id').on('events_categories.category_id', 'in', data.categories!)
        )
    }

    const events = await eventsQuery.orderBy('events.datetime', 'asc').execute()

    return res.status(200).send({
        events: events
    } as EventsAllResponse)
}
