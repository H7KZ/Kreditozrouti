import { redis } from '@api/clients'
import { Request, Response } from 'express'

/**
 * Terminates the user session by invalidating the stored JWT in Redis.
 */
export default async function SignOutController(req: Request, res: Response) {
    await redis.del(`auth:jwt:user:${res.locals.user.id}`)

    return res.sendStatus(201)
}
