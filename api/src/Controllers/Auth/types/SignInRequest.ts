/**
 * Payload for initiating the sign-in process.
 *
 * @route POST /auth/signin
 */
export default interface SignInRequest {
    /** The email address to receive the verification code. */
    email: string

    /**
     * The code challenge string for PKCE authentication.
     * Must be a SHA-256 hash digested to HEX.
     */
    code_challenge: string
}
