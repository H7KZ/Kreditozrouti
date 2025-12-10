import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Interface representing a sign-in confirmation response
 *
 * @route 201 /auth/signin/confirm
 */
export default interface SignInConfirmResponse {
    /**
     * Code indicating that the user has successfully signed in
     *
     * @type {number}
     * @enum {number} SuccessCodeEnum.SIGNED_IN
     */
    code: SuccessCodeEnum.SIGNED_IN

    /**
     * JSON Web Token (JWT) for authenticated access
     *
     * @type {string}
     */
    jwt: string
}
