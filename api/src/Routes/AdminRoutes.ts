import { Router } from 'express'
import AdminStatsController from '@api/Controllers/Admin/AdminStatsController'
import CommandMiddleware from '@api/Middlewares/CommandMiddleware'

/**
 * Router definition for Admin endpoints.
 * Protected by a specialized Command Token middleware.
 *
 * @route /admin
 */
const AdminRoutes = Router()

AdminRoutes.get('/stats', CommandMiddleware, AdminStatsController)

export default AdminRoutes
