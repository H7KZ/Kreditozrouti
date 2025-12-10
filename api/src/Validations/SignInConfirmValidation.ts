import * as z from 'zod'

const SignInConfirmValidation = z.object({
    auth_code: z.string().nonempty().min(6).max(6),
    code_verifier: z.string().nonempty()
})

export default SignInConfirmValidation
