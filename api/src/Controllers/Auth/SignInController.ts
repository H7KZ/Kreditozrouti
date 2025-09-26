import { Request, Response } from 'express'
import { i18n, mysql } from '@/clients'
import { ErrorCodeEnum, ErrorTypeEnum } from '@/Enums/ErrorEnum'
import { SuccessCodeEnum } from '@/Enums/SuccessEnum'
import { Exception } from '@/Interfaces/ErrorInterface'
import SignInValidation from '@/Validations/SignInValidation'

export default async function SignInController(req: Request, res: Response) {
    const result = await SignInValidation.safeParseAsync(req.body)

    if (!result.success) {
        throw new Exception(401, ErrorTypeEnum.ZodValidation, ErrorCodeEnum.Validation, 'Invalid credentials', { zodIssues: result.error.issues })
    }

    // Check if user has email ending with @vse.cz or @diar.4fis.cz
    // If yes, then let him in otherwise return 401
    // If the user sign's in repeatedly also clear out the previous code from cache

    const user = await mysql.user.findUnique({
        where: {
            email: result.data.email
        },
        select: {
            id: true,
            email: true
        }
    })

    if (!user) {
        throw new Exception(401, ErrorTypeEnum.Authentication, ErrorCodeEnum.IncorrectCredentials, 'Invalid credentials')
    }

    // If the user does not exist create the user

    // After 100% sure that the user exists, send user an email with code and time expiration of 10 minutes
    // You can send emails through the EmailService (imported from @/Services/EmailService)
    // The code should be random 8 digit alphanumeric string
    // Save this code to cache (dragonfly - can be imported from @/clients) with expiration time of 10 minutes

    // EmailService.readTemplate also takes variables as second argument which is an object with key value pairs
    // You can use this to replace variables in the email template
    // You will have to replace the "{{emailText}}" variable in the email template with the given i18n translation key

    i18n.init(req, res)

    // You can access the translation function through req.__(key)
    // Keys are located in /locales/en.json and /locales/cs.json

    // Example usage:
    // const translatedText = req.__('some.translation.key')
    // Also you can pass variables to the translation function like this:
    // const translatedText = req.__('some.translation.key', { variableName: 'value' })
    // In the translation file you can use the variable like this: "This is a {{variableName}}"
    // Fill out the code and expiration time in the translation
    // And then pass the translated text to the email template

    // Finally send the email to the user
    // Subject can be found also in the translation files
    // To send emails you can use the EmailService.sendEmail function

    // If everything is successful return 200 with user object (id and email only)
    // If there is any error throw an Exception with appropriate status code, type, code and message

    return res.status(201).send({ code: SuccessCodeEnum.SignInCodeSent })
}
