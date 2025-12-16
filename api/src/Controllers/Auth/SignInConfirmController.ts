import { mysql, redis } from '@api/clients'
import Config from '@api/Config/Config'
import SignInConfirmRequest from '@api/Controllers/Auth/types/SignInConfirmRequest'
import SignInConfirmResponse from '@api/Controllers/Auth/types/SignInConfirmResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import JWTService from '@api/Services/JWTService'
import SignInConfirmValidation from '@api/Validations/SignInConfirmValidation'
import crypto from 'crypto'
import { Request, Response } from 'express'

export default async function SignInConfirmController(req: Request, res: Response) {
    const result = await SignInConfirmValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid credentials', { zodIssues: result.error.issues })
    }

    const data = result.data as SignInConfirmRequest

    // Step 1: Verify the 6-digit code
    const cachedCode = await redis.get(`auth:code:${data.email}`)

    if (cachedCode !== data.code.toString()) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid verification code')
    }

    // Step 2: Verify PKCE challenge
    // Hash the provided code_verifier and compare with stored challenge
    const computedChallenge = crypto.createHash('sha256').update(data.code_verifier).digest('base64url')

    const storedChallenge = await redis.get(`auth:challenge:${computedChallenge}`)
    const storedEmail = await redis.get(`auth:email:${computedChallenge}`)

    if (!storedChallenge || storedEmail !== data.email) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid PKCE verification')
    }

    // Step 3: Get or create user
    let user = await mysql.selectFrom('users').select(['id', 'email']).where('email', '=', data.email).executeTakeFirst()

    user ??= await mysql.insertInto('users').values({ email: data.email }).returning(['id', 'email']).executeTakeFirst()

    if (!user) {
        throw new Exception(500, ErrorTypeEnum.DATABASE, ErrorCodeEnum.INSERT_FAILED, 'Failed to create user')
    }

    // Step 4: Generate JWT tokens
    const tokens = JWTService.createTokenPair(user.id, user.email)

    // Step 5: Store tokens in Redis with TTL
    await redis.setex(`auth:jwt:access:user:${user.id}`, Config.jwt.accessTokenExpirationSeconds, tokens.accessToken)
    await redis.setex(`auth:jwt:refresh:user:${user.id}`, Config.jwt.refreshTokenExpirationSeconds, tokens.refreshToken)

    // Step 6: Clean up Redis keys (code, challenge, email mapping)
    await redis.del(`auth:code:${data.email}`)
    await redis.del(`auth:challenge:${computedChallenge}`)
    await redis.del(`auth:email:${computedChallenge}`)

    // Step 7: Return tokens to client
    return res.status(201).send({
        code: SuccessCodeEnum.SIGNED_IN,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
            id: user.id,
            email: user.email
        }
    } as SignInConfirmResponse)
}
