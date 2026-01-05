import { mysql } from '@api/clients'
import { UsersEvents } from '@api/Database/types/4fis_event.type'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'

/**
 * Removes the current user from the event participants list.
 */

export default async function EventRegisterController(req: Request, res: Response) {
    const { id } = req.params

    // 1. Získání ID uživatele (s ESLint fixem)
    const userId = (req as { user?: { id: string } }).user?.id

    if (!userId) {
        throw new Exception(401, ErrorTypeEnum.AUTHORIZATION, ErrorCodeEnum.UNAUTHORIZED, 'User must be logged in')
    }

    // 2. Provedení smazání z databáze
    const result = await mysql
        .deleteFrom(UsersEvents._table)
        .where('user_id', '=', userId)
        .where('event_id', '=', id)
        .executeTakeFirst()

    if (result.numDeletedRows === BigInt(0)) {

        throw new Exception(
            404,
            ErrorTypeEnum.VALIDATION,
            ErrorCodeEnum.RESOURCE_NOT_FOUND,
            'User was not signed up for this event.'
        )
    }
    return res.status(200).send({
        success: true,
        message: 'User successfully signed out from the event.'
    })
}