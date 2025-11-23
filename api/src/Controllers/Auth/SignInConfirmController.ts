import { mysql, redis } from '@api/clients'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import SignInConfirmRequest from '@api/Interfaces/Routes/SignInConfirmRequest'
import SignInConfirmResponse from '@api/Interfaces/Routes/SignInConfirmResponse'
import SignInConfirmValidation from '@api/Validations/SignInConfirmValidation'
import { Request, Response } from 'express'

export default async function SignInController(req: Request, res: Response) {
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

    return res.status(201).send({
        code: SuccessCodeEnum.SIGNED_IN,
        user: {
            id: user.id,
            email: user.email
        }
    } as SignInConfirmResponse)
}
