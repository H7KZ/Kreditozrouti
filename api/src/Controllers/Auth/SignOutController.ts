import { redis } from '@api/clients'
import SignOutResponse from '@api/Controllers/Auth/types/SignOutResponse'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import { Request, Response } from 'express'

export default async function SignOutController(req: Request, res: Response) {
    await redis.del(`auth:jwt:user:${res.locals.user.id}`)

    return res.status(201).send({
        code: SuccessCodeEnum.SIGNED_OUT
    } as SignOutResponse)
}
