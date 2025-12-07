import * as z from 'zod'

const SignInConfirmValidation = z.object({
    email: z.email().nonempty().min(5).max(255),
    code: z.string().nonempty().min(6).max(6)
})

export default SignInConfirmValidation
