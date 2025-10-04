import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { Exception } from '@api/Interfaces/ErrorInterface'
import { NextFunction, Request, Response } from 'express'

export default function AuthMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) return next()

    throw new Exception(401, ErrorTypeEnum.Authentication, ErrorCodeEnum.Unauthorized, 'User is not authenticated')
}
