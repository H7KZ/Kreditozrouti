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
 * Initiates the sign-in process.
 *
 * Validates the email, enforces domain allowlists, caches the PKCE challenge,
 * and sends a 6-digit verification code to the user via email.
 *
 * @throws {Exception} 401 - If validation fails or the email domain is not authorized.
 */
export default async function SignInController(req: Request, res: Response<SignInResponse>) {
    const result = await SignInValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid credentials', { zodIssues: result.error.issues })
    }

    const data = result.data as SignInRequest
    const { email, code_challenge } = data

    // Domain authorization check
    const isAllowed = email.endsWith('@vse.cz') || email === 'diar.4fis@gmail.com' || email.endsWith('@diar.4fis.cz')

    if (!isAllowed) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    }

    // Clean up previous attempts for this challenge
    await Promise.all([redis.del(`auth:email:${code_challenge}`), redis.del(`auth:challenge:${code_challenge}`), redis.del(`auth:code:${code_challenge}`)])

    // Cache challenge context (TTL: 10 mins)
    await redis.setex(`auth:email:${code_challenge}`, 600, email)
    await redis.setex(`auth:challenge:${code_challenge}`, 600, code_challenge)

    const code = Math.floor(100000 + Math.random() * 900000)
    await redis.setex(`auth:code:${email}`, 600, code.toString())

    // Store the verification code (10 minutes TTL)
    await redis.setex(`auth:code:${data.email}`, 600, code.toString())

    // Initialize i18n for email templates
    i18n.init(req, res)

    // Send verification code via email
    const magicLink = Config.frontend.createURL(`/auth/signin/confirm?code=${code}`)
    const emailSignInTemplate = await EmailService.readTemplate('CodeEmail', {
        emailText: req.__('emails.signIn.body', { expiration: '10' }),
        link: magicLink
    })

    await EmailService.sendEmail({
        to: email,
        subject: req.__('emails.signIn.subject'),
        html: emailSignInTemplate
    })

    return res.status(201).send({
        code: SuccessCodeEnum.SIGN_IN_CODE_SENT
    })
}
