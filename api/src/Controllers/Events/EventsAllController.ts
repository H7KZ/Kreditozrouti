import { mysql } from '@api/clients'
import EventsAllRequest from '@api/Controllers/Events/types/EventsAllRequest'
import EventsAllResponse from '@api/Controllers/Events/types/EventsAllResponse'
import { EventCategoryTable, EventTable } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import EventsAllValidation from '@api/Validations/EventsAllValidation'
import { Request, Response } from 'express'

/**
 * Retrieves a list of events based on optional search and filter criteria.
 * Supports filtering by title, date range, and category IDs.
 *
 * @param req - The Express request object containing query parameters.
 * @param res - The Express response object.
 * @throws {Exception} If the query parameters fail validation schema checks.
 */
export default async function EventsAllController(req: Request, res: Response) {
    const result = await EventsAllValidation.safeParseAsync(req.query)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid search request', { zodIssues: result.error.issues })
    }

    const data = result.data as EventsAllRequest

    const eventsQuery = mysql.selectFrom(EventTable._table).selectAll()

    if (data.title) {
        eventsQuery.where(`${EventTable._table}.title`, 'like', `%${data.title}%`)
    }

    if (data.date_from) {
        eventsQuery.where(`${EventTable._table}.datetime`, '>=', data.date_from)
    }

    if (data.date_to) {
        eventsQuery.where(`${EventTable._table}.datetime`, '<=', data.date_to)
    }

    if (data.categories && data.categories.length > 0) {
        eventsQuery.innerJoin(EventCategoryTable._table, join =>
            join
                .onRef(`${EventTable._table}.id`, '=', `${EventCategoryTable._table}.event_id`)
                .on(`${EventCategoryTable._table}.category_id`, 'in', data.categories!)
        )
    }

    const events = await eventsQuery.orderBy(`${EventTable._table}.datetime`, 'asc').execute()

    return res.status(200).send({
        events: events
    } as EventsAllResponse)
}
