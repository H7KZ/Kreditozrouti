import { mysql } from '@api/clients'
import EventResponse from '@api/Controllers/Events/types/EventResponse'
import { EventTable, UsersEvents } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'
import { sql } from 'kysely'

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
                .as('signup_count'),

            // Je přihlášen aktuální uživatel?
            userId
                ? eb.selectFrom(UsersEvents._table)
                    .where('user_id', '=', userId)
                    .whereRef('event_id', '=', `${EventTable._table}.id`)
                    .select(sql<number>`1`.as('exists'))
                    .as('is_signed_up')
                : sql<number>`0`.as('is_signed_up')
        ])
        .executeTakeFirst()

    if (!eventData) {
        throw new Exception(404, ErrorTypeEnum.VALIDATION, ErrorCodeEnum.RESOURCE_NOT_FOUND, 'Event not found')
    }

    const { signup_count, is_signed_up, ...rest } = eventData

    return res.status(200).send({
        event: {
            ...rest,
            signup_count: Number(signup_count),
            is_signed_up: Boolean(is_signed_up)
        }
    })
}