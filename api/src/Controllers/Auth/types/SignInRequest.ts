/**
 * Interface representing a sign-in request
 *
 * @route POST /auth/signin
 */
export default interface SignInRequest {
    /**
     * The email of the user attempting to sign in
     *
     * @type {string}
     * @required
     */
    email: string

    /**
     * The PKCE code challenge (SHA256 hash of code_verifier)
     *
     * @type {string}
     * @required
     */
    code_challenge: string
}
