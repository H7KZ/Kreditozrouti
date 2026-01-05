import crypto from 'crypto'
import { mysql, redis } from '@api/clients'
import Config from '@api/Config/Config'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import SignInConfirmResponse from '@api/Controllers/Auth/types/SignInConfirmResponse'
import { User, UserTable } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import JWTService from '@api/Services/JWTService'
import SignInConfirmValidation from '@api/Validations/SignInConfirmValidation'
import { Request, Response } from 'express'

/**
 * Finalizes the sign-in process.
 *
 * Verifies the PKCE challenge and the emailed auth code. If valid, it retrieves or creates
 * the user ("Find or Create") and issues a JWT session.
 *
 * @throws {Exception} 401 - If credentials/codes are invalid.
 * @throws {Exception} 500 - If user creation fails.
 */
export default async function SignInConfirmController(req: Request, res: Response<SignInConfirmResponse>) {
    LoggerAPIContext.add(res, { body: req.body })

    const result = await SignInConfirmValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid credentials', { zodIssues: result.error.issues })
    }

    const data = result.data

    // Reconstruct the challenge from the verifier
    const code_challenge = crypto.createHash('sha256').update(data.code_verifier).digest('hex')

    LoggerAPIContext.add(res, { code_challenge: code_challenge })

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

    // Find or Create User
    let user = await mysql.selectFrom(UserTable._table).select(['id', 'email']).where('email', '=', storedEmail).executeTakeFirst()

    if (!user) {
        await mysql.insertInto(UserTable._table).values({ email: storedEmail }).executeTakeFirst()

        user = await mysql.selectFrom(UserTable._table).select(['id', 'email']).where('email', '=', storedEmail).executeTakeFirst()

        LoggerAPIContext.add(res, { new_user: user })
    }

    if (!user) {
        throw new Exception(500, ErrorTypeEnum.DATABASE, ErrorCodeEnum.INSERT_FAILED, 'Failed to create user')
    }

    LoggerAPIContext.add(res, { user_id: user.id })

    // Clean up Auth keys
    await Promise.all([redis.del(`auth:challenge:${code_challenge}`), redis.del(`auth:email:${code_challenge}`), redis.del(`auth:code:${user.email}`)])

    const jwt = await JWTService.createJWTAuthTokenForUser(user as User)

    await redis.setex(`auth:jwt:user:${user.id}`, Config.jwtExpirationSeconds, jwt)

    return res.status(201).send({
        code: SuccessCodeEnum.SIGNED_IN,
        jwt: jwt
    })
}
