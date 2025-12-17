import { mysql, redis } from '@api/clients'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import JWTService from '@api/Services/JWTService'
import { NextFunction, Request, Response } from 'express'

export default async function AuthMiddleware(req: Request, res: Response, next: NextFunction) {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User is not authenticated')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    try {
        // Verify the JWT token
        const payload = JWTService.verifyToken(token)

        // Check if token exists in Redis (not invalidated)
        const storedToken = await redis.get(`auth:jwt:access:user:${payload.userId}`)

        if (!storedToken || storedToken !== token) {
            throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'Token has been invalidated')
        }

        // Fetch user from database
        const user = await mysql.selectFrom('users').select(['id', 'email']).where('id', '=', payload.userId).executeTakeFirst()

        if (!user) {
            throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'User not found')
        }

        // Attach user to res.locals for use in controllers
        res.locals.user = user

        return next()
    } catch (error) {
        if (error instanceof Exception) {
            throw error
        }
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'Invalid or expired token')
    }
}

