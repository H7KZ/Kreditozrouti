import { Request, Response } from 'express'
import { ErrorCodeEnum, ErrorTypeEnum } from '@/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@/Enums/SuccessEnum'
import { Exception } from '@/Interfaces/ErrorInterface'

export default function SignOutController(req: Request, res: Response) {
    return req.logout(error => {
        if (error) {
            throw new Exception(500, ErrorTypeEnum.Unknown, ErrorCodeEnum.InternalServerError, 'Logout failed')
        }

        return res.status(201).send({ code: SuccessCodeEnum.SignedOut })
    })
}
