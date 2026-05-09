import Config from '@api/Config/Config'
import { ApiError, Errors } from '@api/Errors'
import { NextFunction, Request, Response } from 'express'

/**
 * Middleware to secure administrative and scraper command routes.
 * Validates the request against a configured internal command token.
 *
 * @throws {ApiError} 500 - If the server is misconfigured (missing token).
 * @throws {ApiError} 401 - If the provided token is invalid.
 */
export default function CommandMiddleware(req: Request, res: Response, next: NextFunction) {
	if (!Config.commandToken) {
		throw new ApiError(500, 'INTERNAL', 'Command token not configured')
	}

	const token = req.headers.authorization?.split(' ')[1]

	if (token !== Config.commandToken) {
		throw Errors.unauthorized('Unauthorized command access')
	}

	return next()
}
