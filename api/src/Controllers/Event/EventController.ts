import { mysql } from '@api/clients'
import EventResponse from '@api/Controllers/Event/types/EventResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'

export default async function EventController(req: Request, res: Response) {
    const event_id = req.params.id

    const event = await mysql.selectFrom('events').selectAll().where('id', '=', event_id).executeTakeFirst()

    if (!event) {
        throw new Exception(404, ErrorTypeEnum.VALIDATION, ErrorCodeEnum.RESOURCE_NOT_FOUND, 'Event not found')
    }

    return res.status(200).send({
        event: event
    } as EventResponse)
}
