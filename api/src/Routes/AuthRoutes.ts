import SignInConfirmController from '@api/Controllers/Auth/SignInConfirmController'
import SignInController from '@api/Controllers/Auth/SignInController'
import SignOutController from '@api/Controllers/Auth/SignOutController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

/**
 * Router definition for Authentication endpoints.
 * Handles the sign-in flow (request code -> confirm code) and sign-out.
 *
 * @route /auth
 */
const AuthRoutes = Router()

AuthRoutes.post('/signin', ParserJSONMiddleware, SignInController)
AuthRoutes.post('/signin/confirm', ParserJSONMiddleware, SignInConfirmController)
AuthRoutes.post('/signout', ParserJSONMiddleware, AuthMiddleware, SignOutController)

export default AuthRoutes
