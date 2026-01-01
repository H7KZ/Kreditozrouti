import * as z from 'zod'

/**
 * Validation schema for the initial sign-in request.
 * Requires a valid email and a 64-character PKCE code challenge.
 */
const SignInValidation = z.object({
    email: z.email().nonempty().min(5).max(255),
    code_challenge: z.string().nonempty().min(64).max(64)
})

export default SignInValidation
