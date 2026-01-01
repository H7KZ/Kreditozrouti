import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Response structure indicating a verification code was successfully dispatched.
 *
 * @route 201 /auth/signin
 */
export default interface SignInResponse {
    code: SuccessCodeEnum.SIGN_IN_CODE_SENT
}
