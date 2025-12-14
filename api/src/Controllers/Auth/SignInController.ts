import { i18n, redis } from '@api/clients'
import Config from '@api/Config/Config'
import SignInRequest from '@api/Controllers/Auth/types/SignInRequest'
import SignInResponse from '@api/Controllers/Auth/types/SignInResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import EmailService from '@api/Services/EmailService'
import SignInValidation from '@api/Validations/SignInValidation'
import { Request, Response } from 'express'

/**
 * Initiates the sign-in process by generating and sending a verification code.
 * Validates the email address, enforces domain restrictions, and handles code storage.
 *
 * @param req - The Express request object containing the login credentials.
 * @param res - The Express response object.
 * @throws {Exception} If validation fails or the email domain is unauthorized.
 */
export default async function SignInController(req: Request, res: Response) {
    const result = await SignInValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid credentials', { zodIssues: result.error.issues })
    }

    const data = result.data as SignInRequest

    const isAllowed = data.email.endsWith('@vse.cz') || data.email === 'diar.4fis@gmail.com' || data.email.endsWith('@diar.4fis.cz')

    if (!isAllowed) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    }

    await redis.del(`auth:email:${data.code_challenge}`)
    await redis.del(`auth:challenge:${data.code_challenge}`)
    await redis.del(`auth:code:${data.code_challenge}`)

    await redis.setex(`auth:email:${data.code_challenge}`, 600, data.email)
    await redis.setex(`auth:challenge:${data.code_challenge}`, 600, data.code_challenge)

    const code = Math.floor(100000 + Math.random() * 900000) // Generate a random 6 digit code
    await redis.setex(`auth:code:${data.email}`, 600, code.toString())

    i18n.init(req, res)

    const magicLink = Config.frontend.createURL(`/auth/signin/confirm?code=${code}`)

    const emailSignInTemplate = await EmailService.readTemplate('CodeEmail', {
        emailText: req.__('emails.signIn.body', { expiration: '10' }),
        link: magicLink
    })

    await EmailService.sendEmail({
        to: data.email,
        subject: req.__('emails.signIn.subject'),
        html: emailSignInTemplate
    })

    return res.status(201).send({
        code: SuccessCodeEnum.SIGN_IN_CODE_SENT
    } as SignInResponse)
}
