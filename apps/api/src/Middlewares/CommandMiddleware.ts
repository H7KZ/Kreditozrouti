import { createHash, timingSafeEqual } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import Config from '@api/Config/Config'
import { Errors } from '@api/Errors'

/**
 * Constant-time string comparison. Hashes both inputs to equal-length digests
 * so the comparison leaks neither content nor length via timing.
 */
function safeEqual(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest()
	const hb = createHash('sha256').update(b).digest()
	return timingSafeEqual(ha, hb)
}

/**
 * Middleware to secure administrative and scraper command routes.
 * Validates the request against a configured internal command token.
 *
 * @throws {ApiError} 500 - If the server is misconfigured (missing token).
 * @throws {ApiError} 401 - If the provided token is invalid.
 */
export default function CommandMiddleware(req: Request, res: Response, next: NextFunction) {
	if (!Config.commandToken) {
		throw Errors.internal('Command token not configured')
	}

	const token = req.headers.authorization?.split(' ')[1]

	if (!token || !safeEqual(token, Config.commandToken)) {
		throw Errors.unauthorized('Unauthorized command access')
	}

	return next()
}
