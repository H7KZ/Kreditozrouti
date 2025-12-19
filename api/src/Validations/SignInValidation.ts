import * as z from 'zod'

const SignInValidation = z.object({
    email: z.email().nonempty().min(5).max(255),
    code_challenge: z.string().nonempty().min(64).max(64)
})

export default SignInValidation
