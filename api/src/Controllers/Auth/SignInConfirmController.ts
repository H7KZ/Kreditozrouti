import { mysql, redis } from '@api/clients'
import Config from '@api/Config/Config'
import SignInConfirmRequest from '@api/Controllers/Auth/types/SignInConfirmRequest'
import SignInConfirmResponse from '@api/Controllers/Auth/types/SignInConfirmResponse'
import { User } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import JWTService from '@api/Services/JWTService'
import SignInConfirmValidation from '@api/Validations/SignInConfirmValidation'
import { Request, Response } from 'express'

export default async function SignInConfirmController(req: Request, res: Response) {
    const result = await SignInConfirmValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid credentials', { zodIssues: result.error.issues })
    }

    const data = result.data as SignInConfirmRequest

    const cachedCode = await redis.get(`auth:code:${data.email}`)

    if (cachedCode !== data.code.toString()) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    }

    let user = await mysql.selectFrom('users').select(['id', 'email']).where('email', '=', data.email).executeTakeFirst()

    user ??= await mysql.insertInto('users').values({ email: data.email }).returning(['id', 'email']).executeTakeFirst()

    if (!user) {
        throw new Exception(500, ErrorTypeEnum.DATABASE, ErrorCodeEnum.INSERT_FAILED, 'Failed to create user')
    }

    await redis.del(`auth:code:${data.email}`)

    const jwt = await JWTService.createJWTAuthTokenForUser(user as User)

    await redis.setex(`auth:jwt:user:${user.id}`, Config.jwtExpirationSeconds, jwt)

    return res.status(201).send({
        code: SuccessCodeEnum.SIGNED_IN,
        jwt: jwt
    } as SignInConfirmResponse)
}
