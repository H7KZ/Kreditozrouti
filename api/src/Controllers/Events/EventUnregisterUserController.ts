import { mysql } from '@api/clients'
import { UsersEvents } from '@api/Database/types/4fis_event.type'
import { Request, Response } from 'express'

/**
 * Registers the current user to a specific event.
 *
 * @param req - Express request object containing event ID in params.
 * @param res - Express response object.
 */
export default async function EventUnregisterUserController(req: Request, res: Response) {
    const { id: eventId } = req.params

    await mysql.deleteFrom(UsersEvents._table).where('user_id', '=', res.locals.user.id).where('event_id', '=', eventId).executeTakeFirst()

    return res.sendStatus(200)
}
