import * as z from 'zod'

const SignInValidation = z.object({
    email: z.email().nonempty().min(5).max(255)
})

export default SignInValidation
