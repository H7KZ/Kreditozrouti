import * as z from 'zod'

/**
 * Validation schema for the sign-in confirmation payload.
 * Verifies the email format and requires a strictly 6-character verification code.
 */
const SignInConfirmValidation = z.object({
    email: z.email().nonempty().min(5).max(255),
    code: z.string().nonempty().min(6).max(6)
})

export default SignInConfirmValidation
