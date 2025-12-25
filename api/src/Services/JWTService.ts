import Config from '@api/Config/Config'
import { User } from '@api/Database/types'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import * as jose from 'jose'

export default class JWTService {
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
