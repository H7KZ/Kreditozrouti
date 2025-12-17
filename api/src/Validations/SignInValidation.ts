import * as z from 'zod'

/**
 * Validation schema for the initial sign-in request.
 * Enforces email format, non-empty status, and length constraints.
 */
const SignInValidation = z.object({
    email: z.email().nonempty().min(5).max(255),
    code_challenge: z.string().nonempty().min(64).max(64)
})

export default SignInValidation
