import * as z from 'zod'

const SignInValidation = z.object({
    email: z.string().email().min(5).max(255),
    code_challenge: z.string().min(43).max(128) // PKCE code challenge (base64url encoded SHA256 hash)
})

export default SignInValidation
