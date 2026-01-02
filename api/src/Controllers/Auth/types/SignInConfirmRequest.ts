/**
 * Payload for verifying a sign-in attempt and exchanging the code for a token.
 *
 * @route POST /auth/signin/confirm
 */
export default interface SignInConfirmRequest {
    /** The 6-digit confirmation code sent to the user's email. */
    auth_code: string

    /** The code verifier used in the PKCE flow to validate the initial challenge. */
    code_verifier: string
}
