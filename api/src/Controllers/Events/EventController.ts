import { mysql } from '@api/clients'
import EventResponse from '@api/Controllers/Events/types/EventResponse'
import { EventTable } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'

/**
 * Retrieves the details of a specific event by ID.
 *
 * @param req - Express request object containing the event ID in params.
 * @param res - Express response object.
 * @throws {Exception} 404 - If the event is not found.
 */
export default async function EventController(req: Request, res: Response<EventResponse>) {
    const { id } = req.params

    const event = await mysql.selectFrom(EventTable._table).selectAll().where('id', '=', id).executeTakeFirst()

    if (!event) {
        throw new Exception(404, ErrorTypeEnum.VALIDATION, ErrorCodeEnum.RESOURCE_NOT_FOUND, 'Event not found')
    }

    return res.status(200).send({
        event: event
    })
}
