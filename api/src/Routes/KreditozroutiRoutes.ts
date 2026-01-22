import CoursesController from '@api/Controllers/Kreditozrouti/CoursesController'
import StudyPlansController from '@api/Controllers/Kreditozrouti/StudyPlansController'
import TimetableAlternativesController from '@api/Controllers/Kreditozrouti/TimetableAlternativesController'
import TimetableAnalyzeController from '@api/Controllers/Kreditozrouti/TimetableAnalyzeController'
import TimetableConflictsController from '@api/Controllers/Kreditozrouti/TimetableConflictsController'
import TimetableGenerateController from '@api/Controllers/Kreditozrouti/TimetableGenerateController'
import LoggerMiddleware from '@api/Middlewares/LoggerMiddleware'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { Router } from 'express'

/**
 * Router definition for Kreditožrouti (InSIS data) endpoints.
 * Provides public access to course catalogs, study plans, and timetable tools.
 *
 * @route /
 */
const KreditozroutiRoutes = Router()

KreditozroutiRoutes.post('/courses', ParserJSONMiddleware, LoggerMiddleware, CoursesController)

KreditozroutiRoutes.post('/study_plans', ParserJSONMiddleware, LoggerMiddleware, StudyPlansController)

KreditozroutiRoutes.post('/timetable/conflicts', ParserJSONMiddleware, LoggerMiddleware, TimetableConflictsController)
KreditozroutiRoutes.post('/timetable/alternatives', ParserJSONMiddleware, LoggerMiddleware, TimetableAlternativesController)
KreditozroutiRoutes.post('/timetable/generate', ParserJSONMiddleware, LoggerMiddleware, TimetableGenerateController)
KreditozroutiRoutes.post('/timetable/analyze', ParserJSONMiddleware, LoggerMiddleware, TimetableAnalyzeController)

export default KreditozroutiRoutes
