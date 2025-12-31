import Config from '@api/Config/Config'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { NextFunction, Request, Response } from 'express'

/**
 * Middleware to secure administrative and scraper command routes.
 * Validates the request against a configured internal command token.
 *
 * @throws {Exception} 500 - If the server is misconfigured (missing token).
 * @throws {Exception} 401 - If the provided token is invalid.
 */
export default function CommandMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!Config.commandToken) {
        throw new Exception(500, ErrorTypeEnum.UNKNOWN, ErrorCodeEnum.INTERNAL_SERVER_ERROR, 'Command token not configured')
    }

    const token = req.headers.authorization?.split(' ')[1]

    if (token !== Config.commandToken) {
        throw new Exception(401, ErrorTypeEnum.AUTHORIZATION, ErrorCodeEnum.UNAUTHORIZED, 'Unauthorized command access')
    }

    return next()
}
