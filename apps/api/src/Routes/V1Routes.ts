import { Router } from 'express'
import { CatalogueV1Controller } from '@api/Controllers/V1/CatalogueV1Controller'
import { OpenApiV1Controller } from '@api/Controllers/V1/OpenApiV1Controller'
import { UsageV1Controller } from '@api/Controllers/V1/UsageV1Controller'
import { Errors } from '@api/Errors'
import ProblemHandler from '@api/Handlers/ProblemHandler'
import { partnerApi } from '@api/Middlewares/PartnerAuthMiddleware'
import { partnerCors } from '@api/Middlewares/PartnerCorsMiddleware'

/**
 * Partner API. Authenticated with an API key, quota per consumer, errors as problem+json.
 * Callable from a server (no Origin) or from a browser on an origin registered on the key (ADR 0005).
 *
 * @route /v1
 */
const V1Routes = Router()

// First, so preflights are answered before anything needs a key and every response carries the CORS headers.
V1Routes.use(partnerCors)

// The spec describes the API and carries no data, so it needs no key.
V1Routes.get('/openapi.json', OpenApiV1Controller.get)

V1Routes.get('/courses', partnerApi('catalogue:read'), CatalogueV1Controller.listCourses)
V1Routes.get('/courses/:id', partnerApi('catalogue:read'), CatalogueV1Controller.getCourse)
V1Routes.get('/faculties', partnerApi('catalogue:read'), CatalogueV1Controller.listFaculties)
V1Routes.get('/periods', partnerApi('catalogue:read'), CatalogueV1Controller.listPeriods)
V1Routes.get('/study-plans', partnerApi('catalogue:read'), CatalogueV1Controller.listStudyPlans)
V1Routes.get('/study-plans/:id', partnerApi('catalogue:read'), CatalogueV1Controller.getStudyPlan)

V1Routes.get('/lecturers', partnerApi('lecturers:read'), CatalogueV1Controller.listLecturers)
V1Routes.get('/lecturers/:id', partnerApi('lecturers:read'), CatalogueV1Controller.getLecturer)

V1Routes.get('/usage', partnerApi('usage:read'), UsageV1Controller.get)

// Unknown paths under /v1 answer with a problem document, not the HTML default.
V1Routes.use((_req, _res, next) => next(Errors.notFound('Unknown endpoint')))

V1Routes.use(ProblemHandler)

export default V1Routes
