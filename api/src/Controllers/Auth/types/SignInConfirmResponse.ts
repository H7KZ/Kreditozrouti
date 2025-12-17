import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 *  representing a sign-in confirmation response
 *
 * @route POST /auth/signin/confirm
 */
export default interface SignInConfirmResponse {
    /** The success status code indicating the user is signed in. */
    code: SuccessCodeEnum.SIGNED_IN

    /**
     * JSON Web Token (JWT) for authenticated access
     *
     * @type {string}
     */
    jwt: string
}
