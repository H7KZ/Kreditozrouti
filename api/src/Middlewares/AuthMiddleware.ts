import { NextFunction, Request, Response } from 'express'
import { ErrorCodeEnum, ErrorTypeEnum } from '@/Enums/ErrorEnum'
import { Exception } from '@/Interfaces/ErrorInterface'

export default function AuthMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) return next()

    throw new Exception(401, ErrorTypeEnum.Authentication, ErrorCodeEnum.Unauthorized, 'User is not authenticated')
}
