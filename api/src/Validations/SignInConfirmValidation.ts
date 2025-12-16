import * as z from 'zod'

const SignInConfirmValidation = z.object({
    email: z.string().email().min(5).max(255),
    code: z.string().min(6).max(6),
    code_verifier: z.string().min(43).max(128) // PKCE code verifier
})

export default SignInConfirmValidation
