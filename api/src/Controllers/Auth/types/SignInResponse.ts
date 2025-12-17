import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Defines the response structure indicating a verification code was sent.
 * @route POST /auth/signin
 */
export default interface SignInResponse {
    /** The success status code indicating the code dispatch. */
    code: SuccessCodeEnum.SIGN_IN_CODE_SENT
}
