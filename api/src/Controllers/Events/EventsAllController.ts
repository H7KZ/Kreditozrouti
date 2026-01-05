import { mysql } from '@api/clients'
import EventsAllResponse from '@api/Controllers/Events/types/EventsAllResponse'
import { EventCategoryTable, EventTable, UsersEvents } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import EventsAllValidation from '@api/Validations/EventsAllValidation'
import { Request, Response } from 'express'
import { sql } from 'kysely'

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

    const userId = (req as { user?: { id: string } }).user?.id

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


    eventsQuery = eventsQuery.select((eb) => [
        // Počet přihlášených uživatelů
        eb.selectFrom(UsersEvents._table)
            .whereRef(`${UsersEvents._table}.event_id`, '=', `${EventTable._table}.id`)
            .select(eb.fn.countAll().as('count'))
            .as('registered_count'),

        // Je přihlášen aktuální uživatel?
        userId
            ? eb.selectFrom(UsersEvents._table)
                .where('user_id', '=', userId)
                .whereRef('event_id', '=', `${EventTable._table}.id`)
                .select(sql<number>`1`.as('exists'))
                .as('is_registered')
            : sql<number>`0`.as('is_registered')
    ])

    const eventsRaw = await eventsQuery.orderBy(`${EventTable._table}.datetime`, 'asc').execute()

    type DatabaseResult = typeof eventsRaw[0] & {
        registered_count: number | string | bigint
        is_registered: number
    }

    const events = eventsRaw.map(event => {
        const typedEvent = event as unknown as DatabaseResult
        const { registered_count, is_registered, ...rest } = typedEvent
        return {
            ...rest,
            registered_count: Number(registered_count),
            is_registered: Boolean(is_registered)
        }
    })

    return res.status(200).send({
        events: events
    })
}