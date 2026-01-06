import { mysql } from '@api/clients'
import { UsersEvents } from '@api/Database/types/4fis_event.type'
import { Request, Response } from 'express'

/**
 * Removes the current user from the event participants list.
 *
 * @param req - Express request object containing event ID in params.
 * @param res - Express response object.
 */
export default async function EventRegisterUserController(req: Request, res: Response) {
    const { id: eventId } = req.params

    await mysql
        .insertInto(UsersEvents._table)
        .values({
            user_id: res.locals.user.id,
            event_id: eventId
        })
        .execute()

    return res.sendStatus(200)
}
