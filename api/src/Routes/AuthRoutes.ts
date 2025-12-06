import SignInConfirmController from '@api/Controllers/Auth/SignInConfirmController'
import SignInController from '@api/Controllers/Auth/SignInController'
import SignOutController from '@api/Controllers/Auth/SignOutController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

/**
 * Defines the router for authentication endpoints.
 * Handles user sign-in initialization, verification, and session termination.
 */
const AuthRoutes = Router()

AuthRoutes.post('/signin', ParserJSONMiddleware, SignInController)

AuthRoutes.post('/signin/confirm', ParserJSONMiddleware, SignInConfirmController)

AuthRoutes.post('/signout', ParserJSONMiddleware, AuthMiddleware, SignOutController)

export default AuthRoutes
