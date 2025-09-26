import { Router } from 'express'
import SignInController from '@/Controllers/Auth/SignInController'
import SignOutController from '@/Controllers/Auth/SignOutController'
import AuthMiddleware from '@/Middlewares/AuthMiddleware'
import { ParserJSONMiddleware } from '@/Middlewares/ParserMiddleware'

const AuthRoutes = Router()

AuthRoutes.post('/signin', ParserJSONMiddleware, SignInController)

AuthRoutes.post('/signout', ParserJSONMiddleware, AuthMiddleware, SignOutController)

export default AuthRoutes
