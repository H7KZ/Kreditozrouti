import SignInController from '@api/Controllers/Auth/SignInController'
import SignOutController from '@api/Controllers/Auth/SignOutController'
import AuthMiddleware from '@api/Middlewares/AuthMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

const AuthRoutes = Router()

AuthRoutes.post('/signin', ParserJSONMiddleware, SignInController)

AuthRoutes.post('/signout', ParserJSONMiddleware, AuthMiddleware, SignOutController)

export default AuthRoutes
