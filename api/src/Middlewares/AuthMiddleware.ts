import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { NextFunction, Request, Response } from 'express'

/**
 * Express middleware to enforce user authentication on protected routes.
 * Checks if a user session exists; proceeds if authenticated, otherwise throws an error.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function to pass control to the next handler.
 * @throws {Exception} 401 Unauthorized if the user is not authenticated.
 */
export default function AuthMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) return next()

    throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User is not authenticated')
}
