/**
 * Interface representing a sign-in confirmation request
 *
 * @route POST /auth/signin/confirm
 */
export default interface SignInConfirmRequest {
    /**
     * The email of the user attempting to sign in
     *
     * @type {string}
     * @required
     */
    email: string

    /**
     * The confirmation code sent to the user's email
     *
     * @type {string}
     * @required
     */
    code: string

    /**
     * The PKCE code verifier (original random string)
     *
     * @type {string}
     * @required
     */
    code_verifier: string
}
