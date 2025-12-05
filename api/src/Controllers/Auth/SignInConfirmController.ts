import crypto from 'crypto'
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

    const code_challenge = crypto.createHash('sha256').update(data.code_verifier).digest('hex')

    const storedCodeChallenge = await redis.get(`auth:challenge:${code_challenge}`)

    if (storedCodeChallenge !== code_challenge) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    }

    const storedEmail = await redis.get(`auth:email:${code_challenge}`)

    if (!storedEmail) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    }

    const storedCode = await redis.get(`auth:code:${storedEmail}`)

    if (storedCode !== data.auth_code.toString()) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    }

    let user = await mysql.selectFrom('users').select(['id', 'email']).where('email', '=', storedEmail).executeTakeFirst()

    user ??= await mysql.insertInto('users').values({ email: storedEmail }).returning(['id', 'email']).executeTakeFirst()

    if (!user) {
        throw new Exception(500, ErrorTypeEnum.DATABASE, ErrorCodeEnum.INSERT_FAILED, 'Failed to create user')
    }

    await redis.del(`auth:challenge:${code_challenge}`)
    await redis.del(`auth:email:${code_challenge}`)
    await redis.del(`auth:code:${user.email}`)

    const jwt = await JWTService.createJWTAuthTokenForUser(user as User)

    await redis.setex(`auth:jwt:user:${user.id}`, Config.jwtExpirationSeconds, jwt)

    return res.status(201).send({
        code: SuccessCodeEnum.SIGNED_IN,
        jwt: jwt
    } as SignInConfirmResponse)
}
