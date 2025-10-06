import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import SignOutResponse from '@api/Interfaces/Routes/SignOutResponse'
import { Request, Response } from 'express'

export default function SignOutController(req: Request, res: Response) {
    return req.logout(error => {
        if (error) {
            throw new Exception(500, ErrorTypeEnum.UNKNOWN, ErrorCodeEnum.INTERNAL_SERVER_ERROR, 'Logout failed')
        }

        return res.status(201).send({
            code: SuccessCodeEnum.SIGNED_OUT
        } as SignOutResponse)
    })
}
