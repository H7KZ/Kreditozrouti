import { Router } from 'express'
import AdminStatsController from '@api/Controllers/Admin/AdminStatsController'
import CommandMiddleware from '@api/Middlewares/CommandMiddleware'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'

/**
 * Router definition for Admin endpoints.
 * Protected by a specialized Command Token middleware.
 *
 * @route /admin
 */
const AdminRoutes = Router()

AdminRoutes.get('/stats', CommandMiddleware, LoggerMiddleware, AdminStatsController)

export default AdminRoutes
