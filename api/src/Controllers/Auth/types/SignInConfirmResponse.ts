import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Response structure containing the authenticated session data.
 *
 * @route POST /auth/signin/confirm
 */
export default interface SignInConfirmResponse {
    code: SuccessCodeEnum.SIGNED_IN

    /** JSON Web Token (JWT) for authenticated access. */
    jwt: string
}
