import { NextFunction, Request, Response } from 'express'
import Config from '@api/Config/Config'
import { Errors } from '@api/Errors'

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

	if (token !== Config.commandToken) {
		throw Errors.unauthorized('Unauthorized command access')
	}

	return next()
}
