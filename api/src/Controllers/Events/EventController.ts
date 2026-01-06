import { mysql } from '@api/clients'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import EventResponse, { EventWithRegistration } from '@api/Controllers/Events/types/EventResponse'
import { EventTable, UsersEvents } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'
import { sql } from 'kysely'

/**
 * Retrieves the details of a specific event by ID.
 *
 * @param req - Express request object containing the event ID in params.
 * @param res - Express response object.
 * @throws {Exception} 404 - If the event is not found.
 */
export default async function EventController(req: Request, res: Response<EventResponse>) {
    const { id: eventId } = req.params

    LoggerAPIContext.add(res, { eventId })

    const userId = (req as { user?: { id: string } }).user?.id

    const eventWithRegistration = await mysql
        .selectFrom(EventTable._table)
        .selectAll()
        .where('id', '=', eventId)
        .select(eb => [
            // Count registered users
            eb
                .selectFrom(UsersEvents._table)
                .whereRef(`${UsersEvents._table}.event_id`, '=', `${EventTable._table}.id`)
                .select(eb.fn.countAll().as('count'))
                .as('registered_users_count'),

            // Is current user registered
            userId
                ? eb
                      .selectFrom(UsersEvents._table)
                      .where('user_id', '=', res.locals.user.id)
                      .whereRef('event_id', '=', `${EventTable._table}.id`)
                      .select(sql<number>`1`.as('exists'))
                      .as('user_registered')
                : sql<number>`0`.as('user_registered')
        ])
        .executeTakeFirst()

    if (!eventWithRegistration) {
        throw new Exception(404, ErrorTypeEnum.VALIDATION, ErrorCodeEnum.RESOURCE_NOT_FOUND, 'Event not found')
    }

    return res.status(200).send({
        // We know that eventWithRegistration is in the correct format
        // No need to transform it further
        event: eventWithRegistration as unknown as EventWithRegistration
    })
}
