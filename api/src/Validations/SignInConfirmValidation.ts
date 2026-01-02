import * as z from 'zod'

/**
 * Validation schema for the sign-in confirmation payload.
 * Requires the PKCE verifier and the 6-digit auth code.
 */
const SignInConfirmValidation = z.object({
    auth_code: z.string().nonempty().min(6).max(6),
    code_verifier: z.string().nonempty()
})

export default SignInConfirmValidation
