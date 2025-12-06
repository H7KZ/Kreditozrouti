/**
 * Defines the request payload for verifying a sign-in attempt.
 * @route POST /auth/signin/confirm
 */
export default interface SignInConfirmRequest {
    /** The user's email address. */
    email: string

    /** The verification code provided by the user. */
    code: string
}
