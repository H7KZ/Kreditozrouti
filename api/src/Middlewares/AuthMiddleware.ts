import { mysql, redis } from '@api/clients'
import { User } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import JWTService from '@api/Services/JWTService'
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
export default async function AuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const jwt = req.headers.authorization?.split(' ')[1]

    if (!jwt) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User is not authenticated')
    }

    const jwtVerify = await JWTService.verifyJWTAuthToken(jwt)

    if (!jwtVerify.payload || !jwtVerify.protectedHeader) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User is not authenticated')
    }

    const payload = jwtVerify.payload as { userId: number }

    const cachedJWT: string | null = await redis.get(`auth:jwt:user:${payload.userId}`)

    if (!cachedJWT) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User is not authenticated')
    }

    if (cachedJWT !== jwt) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User is not authenticated')
    }

    let user: User | string | null | undefined = await redis.get(`user:${payload.userId}`)

    if (user) {
        res.locals.user = JSON.parse(user) as User
        return next()
    }

    user = await mysql.selectFrom('users').selectAll().where('id', '=', payload.userId).executeTakeFirst()

    if (!user) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User is not authenticated')
    }

    await redis.setex(`user:${user.id}`, 60, JSON.stringify(user))

    res.locals.user = user

    return next()
}
