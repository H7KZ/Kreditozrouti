import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Interface representing a sign-in confirmation response
 *
 * @route 201 /auth/signin
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
     * The signed-in user's information
     *
     * @type {object}
     */
    user: {
        /**
         * The Id of the signed-in user
         *
         * @type {number}
         */
        id: number

        /**
         * The email of the signed-in user
         *
         * @type {string}
         */
        email: string
    }
}
