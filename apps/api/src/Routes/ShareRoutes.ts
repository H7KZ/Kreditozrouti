import { Router } from 'express'
import ShareCreateController from '@api/Controllers/Share/ShareCreateController'
import ShareGetController from '@api/Controllers/Share/ShareGetController'
import { ParserJSONMiddleware } from '@api/Middlewares/ParserMiddleware'
import { shareRateLimit } from '@api/Middlewares/RateLimitMiddleware'

const ShareRoutes = Router()

ShareRoutes.post('/', ParserJSONMiddleware, shareRateLimit, ShareCreateController)
ShareRoutes.get('/:id', ShareGetController)

export default ShareRoutes
