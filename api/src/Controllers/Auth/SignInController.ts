import { i18n, redis } from '@api/clients'
import SignInRequest from '@api/Controllers/Auth/types/SignInRequest'
import SignInResponse from '@api/Controllers/Auth/types/SignInResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'
import Exception from '@api/Error/Exception'
import EmailService from '@api/Services/EmailService'
import SignInValidation from '@api/Validations/SignInValidation'
import { Request, Response } from 'express'

export default async function SignInController(req: Request, res: Response) {
    const result = await SignInValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid credentials', { zodIssues: result.error.issues })
    }

    const data = result.data as SignInRequest

    // Validate email domain (only @vse.cz or diar.4fis@gmail.com allowed)
    const isVseEmail = data.email.endsWith('@vse.cz')
    const isSystemEmail = data.email === 'diar.4fis@gmail.com'

    if (!isVseEmail && !isSystemEmail) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    }

    // Clean up any existing codes and challenges for this email
    await redis.del(`auth:code:${data.email}`)

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000)

    // Store the PKCE challenge and email mapping in Redis (10 minutes TTL)
    await redis.setex(`auth:challenge:${data.code_challenge}`, 600, data.code_challenge)
    await redis.setex(`auth:email:${data.code_challenge}`, 600, data.email)

    // Store the verification code (10 minutes TTL)
    await redis.setex(`auth:code:${data.email}`, 600, code.toString())

    // Initialize i18n for email templates
    i18n.init(req, res)

    // Send verification code via email
    const emailSignInTemplate = await EmailService.readTemplate('CodeEmail', {
        emailText: req.__('emails.signIn.body', { code: code.toString(), expiration: '10' })
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
