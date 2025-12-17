import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Defines the response structure for a successful logout event.
 * @route POST /auth/signout
 */
export default interface SignOutResponse {
    /** The success status code indicating session termination. */
    code: SuccessCodeEnum.SIGNED_OUT
}
