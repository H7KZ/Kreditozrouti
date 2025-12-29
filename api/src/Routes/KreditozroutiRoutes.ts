import CoursesController from '@api/Controllers/Kreditozrouti/CoursesController'
import StudyPlansController from '@api/Controllers/Kreditozrouti/StudyPlansController'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

const KreditozroutiRoutes = Router()

KreditozroutiRoutes.post('/courses', ParserJSONMiddleware, CoursesController)

KreditozroutiRoutes.post('/study_plans', ParserJSONMiddleware, StudyPlansController)

export default KreditozroutiRoutes
