import { redis } from '@api/clients'
import SignOutResponse from '@api/Controllers/Auth/types/SignOutResponse'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import { Request, Response } from 'express'

/**
 * Terminates the current user session and logs the user out.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @throws {Exception} If the logout process encounters an internal error.
 */
export default async function SignOutController(req: Request, res: Response) {
    await redis.del(`auth:jwt:user:${res.locals.user.id}`)

    return res.status(201).send({
        code: SuccessCodeEnum.SIGNED_OUT
    } as SignOutResponse)
}
