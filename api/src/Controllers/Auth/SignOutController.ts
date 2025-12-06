import SignOutResponse from '@api/Controllers/Auth/types/SignOutResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import { Request, Response } from 'express'

/**
 * Terminates the current user session and logs the user out.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @throws {Exception} If the logout process encounters an internal error.
 */
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
