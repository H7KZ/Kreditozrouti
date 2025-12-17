import * as z from 'zod'

/**
 * Validation schema for the sign-in confirmation payload.
 * Verifies the email format and requires a strictly 6-character verification code.
 */
const SignInConfirmValidation = z.object({
    auth_code: z.string().nonempty().min(6).max(6),
    code_verifier: z.string().nonempty()
})

export default SignInConfirmValidation
