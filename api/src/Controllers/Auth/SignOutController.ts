import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import { Exception } from '@api/Interfaces/ErrorInterface'
import { Request, Response } from 'express'

export default function SignOutController(req: Request, res: Response) {
    return req.logout(error => {
        if (error) {
            throw new Exception(500, ErrorTypeEnum.Unknown, ErrorCodeEnum.InternalServerError, 'Logout failed')
        }

        return res.status(201).send({ code: SuccessCodeEnum.SignedOut })
    })
}
