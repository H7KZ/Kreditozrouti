import { SuccessCodeEnum } from '@api/Enums/SuccessEnum'

/**
 * Defines the response structure returned upon successful authentication.
 * @route 201 /auth/signin
 */
export default interface SignInConfirmResponse {
    /** The success status code indicating the user is signed in. */
    code: SuccessCodeEnum.SIGNED_IN

    /** The authenticated user's profile data. */
    user: {
        /** The unique identifier of the user. */
        id: number

        /** The user's email address. */
        email: string
    }
}
