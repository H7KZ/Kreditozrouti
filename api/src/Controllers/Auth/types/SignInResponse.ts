import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Interface representing a sign-in response
 *
 * @route 201 /auth/signin
 */
export default interface SignInResponse {
    /**
     * Code indicating that the sign-in code has been sent
     *
     * @type {number}
     * @enum {number} SuccessCodeEnum.SIGN_IN_CODE_SENT
     */
    code: SuccessCodeEnum.SIGN_IN_CODE_SENT
}
