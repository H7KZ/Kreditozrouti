import { mysql } from '@api/clients'
import { UsersEvents, EventTable } from '@api/Database/types/4fis_event.type' // Ujisti se, že cesta sedí
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'
import { DatabaseError} from '@api/Database/types/DatabaseError'

/**
 * Registers the current user to a specific event.
 *
 * @param req - Express request object containing event ID in params.
 * @param res - Express response object.
 * @throws {Exception} 404 - Event not found.
 * @throws {Exception} 409 - User already registered.
 */

export default async function EventUnregisterController(req: Request, res: Response) {
    const { id } = req.params

    const userId = (req as { user?: { id: string } }).user?.id
    if (!userId) {
        throw new Exception(401, ErrorTypeEnum.AUTHORIZATION, ErrorCodeEnum.UNAUTHORIZED, 'User must be logged in')
    }

    const eventExists = await mysql
        .selectFrom(EventTable._table)
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst()
    if (!eventExists) {
        throw new Exception(404, ErrorTypeEnum.VALIDATION, ErrorCodeEnum.RESOURCE_NOT_FOUND, 'Event not found')
    }

    try {
        await mysql
            .insertInto(UsersEvents._table)
            .values({
                user_id: userId,
                event_id: id,
            })
            .execute()

        return res.status(201).send({
            success: true,
            message: 'User successfully signed up for the event.'
        })
    } catch (error) {
        const dbError = error as DatabaseError
        if (dbError.code === 'ER_DUP_ENTRY' || dbError.errno === 1062) {
            throw new Exception(
                409,
                ErrorTypeEnum.VALIDATION,
                ErrorCodeEnum.RESOURCE_EXISTS,
                'User is already signed up for this event.'
            )
        }
        throw error
    }
}
