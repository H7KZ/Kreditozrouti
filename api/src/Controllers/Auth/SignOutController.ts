import { redis } from '@api/clients'
import SignOutResponse from '@api/Controllers/Auth/types/SignOutResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import JWTService from '@api/Services/JWTService'
import { Request, Response } from 'express'

export default async function SignOutController(req: Request, res: Response) {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'No token provided')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    try {
        // Verify and decode the token to get userId
        const payload = JWTService.verifyToken(token)

        // Delete both access and refresh tokens from Redis
        await redis.del(`auth:jwt:access:user:${payload.userId}`)
        await redis.del(`auth:jwt:refresh:user:${payload.userId}`)

        return res.status(200).send({
            code: SuccessCodeEnum.SIGNED_OUT
        } as SignOutResponse)
    } catch {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'Invalid token')
    }
}
