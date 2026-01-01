import { mysql } from '@api/clients'
import EventsAllResponse from '@api/Controllers/Events/types/EventsAllResponse'
import { EventCategoryTable, EventTable } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import EventsAllValidation from '@api/Validations/EventsAllValidation'
import { Request, Response } from 'express'

/**
 * Retrieves a list of events based on optional search criteria.
 *
 * Supports filtering by title, date range, and category IDs.
 * Returns all events ordered by date if no filters are applied.
 *
 * @param req - Express request object containing query parameters.
 * @param res - Express response object.
 * @throws {Exception} 401 - If validation of search parameters fails.
 */
export default async function EventsAllController(req: Request, res: Response<EventsAllResponse>) {
    const result = await EventsAllValidation.safeParseAsync(req.query)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
    }

    const data = result.data
    let eventsQuery = mysql.selectFrom(EventTable._table).selectAll()

    if (data.title) {
        eventsQuery = eventsQuery.where(`${EventTable._table}.title`, 'like', `%${data.title}%`)
    }

    if (data.date_from) {
        eventsQuery = eventsQuery.where(`${EventTable._table}.datetime`, '>=', data.date_from)
    }

    if (data.date_to) {
        eventsQuery = eventsQuery.where(`${EventTable._table}.datetime`, '<=', data.date_to)
    }

    if (data.categories && data.categories.length > 0) {
        eventsQuery = eventsQuery.innerJoin(EventCategoryTable._table, join =>
            join
                .onRef(`${EventTable._table}.id`, '=', `${EventCategoryTable._table}.event_id`)
                .on(`${EventCategoryTable._table}.category_id`, 'in', data.categories!)
        )
    }

    const events = await eventsQuery.orderBy(`${EventTable._table}.datetime`, 'asc').execute()

    return res.status(200).send({
        events: events
    })
}
