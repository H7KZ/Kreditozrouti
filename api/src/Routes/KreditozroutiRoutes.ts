import CoursesController from '@api/Controllers/Kreditozrouti/CoursesController'
import { Router } from 'express'

const KreditozroutiRoutes = Router()

KreditozroutiRoutes.get('/courses', CoursesController)

export default KreditozroutiRoutes
