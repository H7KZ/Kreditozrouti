/**
 * Response structure containing the authenticated session data.
 *
 * @route POST /auth/signin/confirm
 */
export default interface SignInConfirmResponse {
    /** JSON Web Token (JWT) for authenticated access. */
    jwt: string
}
