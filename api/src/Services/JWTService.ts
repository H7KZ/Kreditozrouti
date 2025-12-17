import Config from '@api/Config/Config'
import jwt, { SignOptions } from 'jsonwebtoken'

export interface JWTPayload {
    userId: number
    email: string
    type: 'access' | 'refresh'
}

export interface JWTTokenPair {
    accessToken: string
    refreshToken: string
}

export class JWTService {
    /**
     * Create an access token for a user
     */
    static createAccessToken(userId: number, email: string): string {
        const payload: JWTPayload = {
            userId,
            email,
            type: 'access'
        }

        return jwt.sign(
            payload,
            Config.jwt.secret,
            {
                expiresIn: Config.jwt.accessTokenExpiration,
                issuer: Config.jwt.issuer,
                audience: Config.jwt.audience
            } as SignOptions
        )
    }

    /**
     * Create a refresh token for a user
     */
    static createRefreshToken(userId: number, email: string): string {
        const payload: JWTPayload = {
            userId,
            email,
            type: 'refresh'
        }

        return jwt.sign(
            payload,
            Config.jwt.secret,
            {
                expiresIn: Config.jwt.refreshTokenExpiration,
                issuer: Config.jwt.issuer,
                audience: Config.jwt.audience
            } as SignOptions
        )
    }

    /**
     * Create both access and refresh tokens for a user
     */
    static createTokenPair(userId: number, email: string): JWTTokenPair {
        return {
            accessToken: this.createAccessToken(userId, email),
            refreshToken: this.createRefreshToken(userId, email)
        }
    }

    /**
     * Verify a JWT token and return the decoded payload
     */
    static verifyToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, Config.jwt.secret, {
                issuer: Config.jwt.issuer,
                audience: Config.jwt.audience
            }) as JWTPayload
        } catch {
            throw new Error('Invalid or expired token')
        }
    }

    /**
     * Decode a JWT token without verifying (useful for debugging)
     */
    static decodeToken(token: string): JWTPayload | null {
        try {
            return jwt.decode(token) as JWTPayload
        } catch {
            return null
        }
    }
}

export default JWTService

