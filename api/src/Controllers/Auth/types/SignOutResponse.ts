import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Response structure for a successful logout event.
 *
 * @route 201 /auth/signout
 */
export default interface SignOutResponse {
    code: SuccessCodeEnum.SIGNED_OUT
}
