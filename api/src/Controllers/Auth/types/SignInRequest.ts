/**
 * Defines the request payload for initiating the sign-in process.
 * @route POST /auth/signin
 */
export default interface SignInRequest {
    /** The email address to receive the verification code. */
    email: string

    /**
     * The code challenge string for PKCE authentication
     * Hashed using SHA-256 digested to HEX
     *
     * @type {string}
     * @required
     */
    code_challenge: string
}
