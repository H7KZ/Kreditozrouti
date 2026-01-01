import { mysql, redis } from '@api/clients'
import { User, UserTable } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import JWTService from '@api/Services/JWTService'
import { NextFunction, Request, Response } from 'express'

/**
 * Express middleware to enforce user authentication on protected routes.
 *
 * Validates the JWT, ensures the session is active in Redis, and attaches
 * the User object to `res.locals.user`.
 *
 * @throws {Exception} 401 - If the token is missing, invalid, expired, or the session has been revoked.
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

    // Validate Session against Redis (Single Sign-On / Logout enforcement)
    const cachedJWT = await redis.get(`auth:jwt:user:${payload.userId}`)

    if (!cachedJWT || cachedJWT !== jwt) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'Session expired or invalid')
    }

    // Retrieve User Profile
    let user: User | string | null | undefined = await redis.get(`user:${payload.userId}`)

    if (user) {
        res.locals.user = JSON.parse(user) as User
        return next()
    }

    user = await mysql.selectFrom(UserTable._table).selectAll().where('id', '=', payload.userId).executeTakeFirst()

    if (!user) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User not found')
    }

    // Cache user profile for 60 seconds
    await redis.setex(`user:${user.id}`, 60, JSON.stringify(user))

    // Attach user to response locals for downstream access
    res.locals.user = user
    return next()
}
