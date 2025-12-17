import Config from '@api/Config/Config'
import { User } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import * as jose from 'jose'

/**
 * Service responsible for managing JSON Web Token (JWT) lifecycles.
 * Handles the creation (signing) of tokens for authenticated users and
 * the cryptographic verification of incoming tokens.
 */
export default class JWTService {
    /**
     * Generates a signed JWT for an authenticated user.
     * @remarks
     * The token is signed using the HS256 algorithm.
     * It embeds the `userId` as a custom claim and sets standard claims
     * (issuer, audience, expiration) defined in the application configuration.
     *
     * @param user - The user entity for whom the token is being generated.
     * @returns A Promise resolving to the signed JWT string.
     * @throws {Exception} If the signing process encounters an error (Internal Server Error).
     */
    static async createJWTAuthTokenForUser(user: User): Promise<string> {
        try {
            return await new jose.SignJWT({ userId: user.id })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setIssuer(Config.jwt.issuer)
                .setAudience(Config.jwt.audience)
                .setExpirationTime(Config.jwt.expiration)
                .sign(Config.jwt.secret)
        } catch {
            throw new Exception(500, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.SIGN_IN_FAILED, 'Failed to sign JWT')
        }
    }

    /**
     * Validates the integrity and claims of a provided JWT.
     * @remarks
     * This method verifies the signature using the server's secret and ensures
     * the token matches the expected issuer, audience, and algorithm (HS256).
     *
     * @param token - The raw JWT string to verify.
     * @returns A Promise resolving to the verification result containing the payload and header.
     * @throws {Exception} If the token is invalid, expired, or malformed (Unauthorized).
     */
    static async verifyJWTAuthToken(token: string): Promise<jose.JWTVerifyResult> {
        try {
            return await jose.jwtVerify(token, Config.jwt.secret, {
                issuer: Config.jwt.issuer,
                audience: Config.jwt.audience,
                algorithms: ['HS256']
            })
        } catch {
            throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'Invalid JWT token')
        }
    }
}
