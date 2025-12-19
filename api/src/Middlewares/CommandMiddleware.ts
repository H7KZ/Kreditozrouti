import Config from '@api/Config/Config'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { NextFunction, Request, Response } from 'express'

export default function CommandMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!Config.commandToken) {
        throw new Exception(500, ErrorTypeEnum.UNKNOWN, ErrorCodeEnum.UNKNOWN, ":'(")
    }

    const token = req.headers.authorization?.split(' ')[1]

    if (token !== Config.commandToken) {
        throw new Exception(401, ErrorTypeEnum.UNKNOWN, ErrorCodeEnum.UNKNOWN, ":'(")
    }

    return next()
}
