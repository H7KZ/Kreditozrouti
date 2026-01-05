import SignInConfirmController from '@api/Controllers/Auth/SignInConfirmController'
import SignInController from '@api/Controllers/Auth/SignInController'
import SignOutController from '@api/Controllers/Auth/SignOutController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

/**
 * Router definition for Authentication endpoints.
 * Handles the sign-in flow (request code -> confirm code) and sign-out.
 *
 * @route /auth
 */
const AuthRoutes = Router()

AuthRoutes.post('/signin', ParserJSONMiddleware, LoggerMiddleware, SignInController)

AuthRoutes.post('/signin/confirm', ParserJSONMiddleware, LoggerMiddleware, SignInConfirmController)

AuthRoutes.post('/signout', ParserJSONMiddleware, LoggerMiddleware, AuthMiddleware, SignOutController)

export default AuthRoutes
