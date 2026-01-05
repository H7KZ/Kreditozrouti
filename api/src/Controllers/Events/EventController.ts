import { mysql } from '@api/clients'
import EventResponse from '@api/Controllers/Events/types/EventResponse'
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
    const { id } = req.params

    const userId = (req as { user?: { id: string } }).user?.id

    const eventData = await mysql
        .selectFrom(EventTable._table)
        .selectAll()
        .where('id', '=', id)
        .select((eb) => [

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
        .executeTakeFirst()

    if (!eventData) {
        throw new Exception(404, ErrorTypeEnum.VALIDATION, ErrorCodeEnum.RESOURCE_NOT_FOUND, 'Event not found')
    }

    const { registered_count, is_registered, ...rest } = eventData

    return res.status(200).send({
        event: {
            ...rest,
            registered_count: Number(registered_count),
            is_registered: Boolean(is_registered)
        }
    })
}