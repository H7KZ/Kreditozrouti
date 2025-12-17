/**
 * Defines the request payload for verifying a sign-in attempt.
 * @route POST /auth/signin/confirm
 */
export default interface SignInConfirmRequest {
    /**
     The confirmation code sent to the user's email
     *
     * @type {string}
     * @required
     */
    auth_code: string

    /**
     * The code verifier used in the PKCE flow
     *
     * @type {string}
     * @required
     */
    code_verifier: string
}
