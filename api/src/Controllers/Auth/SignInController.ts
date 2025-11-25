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

    if (!data.email.endsWith('@vse.cz')) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    } else if (data.email.endsWith('@diar.4fis.cz')) {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    } else if (data.email !== 'diar.4fis@gmail.com') {
        throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.INCORRECT_CREDENTIALS, 'Invalid credentials')
    }

    await redis.del(`auth:code:${data.email}`)

    const code = Math.floor(100000 + Math.random() * 900000) // Generate a random 6 digit code

    await redis.setex(`auth:code:${data.email}`, 600, code.toString()) // Save code to redis with 10 minutes expiration

    i18n.init(req, res)

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
