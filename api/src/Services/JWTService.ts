import Config from '@api/Config/Config'
import { User } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import * as jose from 'jose'

/**
 * Service for handling JSON Web Token (JWT) generation and verification.
 */
export default class JWTService {
    /**
     * Generates a signed HS256 JWT for the provided user.
     *
     * @param user - The user entity for whom the token is being created.
     * @returns A promise resolving to the signed JWT string.
     * @throws {Exception} 500 - If signing fails.
     */
    static async createJWTAuthTokenForUser(user: User): Promise<string> {
        try {
            return await new jose.SignJWT({ userId: user.id })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setIssuer(Config.jwtIssuer)
                .setAudience(Config.jwtAudience)
                .setExpirationTime(Config.jwtExpiration)
                .sign(Config.jwtSecret)
        } catch {
            throw new Exception(500, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.SIGN_IN_FAILED, 'Failed to sign JWT')
        }
    }

    /**
     * Verifies the validity of a JWT string.
     * Checks the signature, issuer, audience, and expiration.
     *
     * @param token - The JWT string to verify.
     * @returns The decoded payload and header if valid.
     * @throws {Exception} 401 - If the token is invalid or expired.
     */
    static async verifyJWTAuthToken(token: string): Promise<jose.JWTVerifyResult> {
        try {
            return await jose.jwtVerify(token, Config.jwtSecret, {
                issuer: Config.jwtIssuer,
                audience: Config.jwtAudience,
                algorithms: ['HS256']
            })
        } catch {
            throw new Exception(401, ErrorTypeEnum.AUTHENTICATION, ErrorCodeEnum.UNAUTHORIZED, 'Invalid JWT token')
        }
    }
}
