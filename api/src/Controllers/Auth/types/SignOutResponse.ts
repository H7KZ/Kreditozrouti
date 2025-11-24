import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Interface representing a sign-out response
 *
 * @route 201 /auth/signout
 */
export default interface SignOutResponse {
    /**
     * Code indicating successful sign-out
     *
     * @type {number}
     * @enum {number} SuccessCodeEnum.SIGNED_OUT
     */
    code: SuccessCodeEnum.SIGNED_OUT
}
