import type { ApiScope } from '@kreditozrouti/types'
import { checkQuota, isOriginAllowed, recordUsage } from '@kreditozrouti/core/partner-api'
import { NextFunction, Request, Response } from 'express'
import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import { Errors } from '@api/Errors'
import { logger } from '@api/logger'
import { recordPartnerRequest, recordQuotaStoreError } from '@api/metrics'
import { hasScope, PartnerAuthService } from '@api/Services/Partner/PartnerAuthService'
import { RedisQuotaStore } from '@api/Services/Partner/RedisQuotaStore'
import { RedisUsageCounterStore } from '@api/Services/Partner/RedisUsageCounterStore'

/**
 * Guards a `/v1` route: verifies the API key, checks the scope, then counts the request against the
 * consumer's plan. Order matters: a bad key never reaches the quota store, and a request without the
 * scope is rejected before it spends quota.
 *
 * Once the key is verified the request is recorded (Prometheus counter + hourly usage counters + wide log
 * event) whatever the outcome, so 403 and 429 responses show up in the consumer's usage.
 */
export function partnerApi(scope: ApiScope) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const auth = await PartnerAuthService.authenticate(req.headers.authorization)

			if (!auth.ok) {
				LoggerAPIContext.add({ partner_auth_failure: auth.reason })
				res.setHeader('WWW-Authenticate', 'Bearer realm="kreditozrouti"')
				throw Errors.unauthorized('Missing or invalid API key')
			}

			const { principal } = auth
			req.partner = principal
			LoggerAPIContext.add({ consumer: principal.consumerSlug, consumer_id: principal.consumerId, key_id: principal.keyId })

			const startedAt = process.hrtime.bigint()
			res.on('finish', () => {
				const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
				// req.route is only set once Express matched a route, and baseUrl carries the `/v1` mount.
				const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched'

				recordPartnerRequest(principal.consumerSlug, route, res.statusCode)
				recordUsage(RedisUsageCounterStore, {
					consumerId: principal.consumerId,
					keyId: principal.keyId,
					route,
					status: res.statusCode,
					durationMs
				}).catch(err => logger.warn({ err }, 'partner.usage_record_failed'))
			})

			// Requests without an Origin header are not from a browser and need no origin on the key. A browser
			// request must come from one of the key's origins; a key with none is server-only and is refused
			// here, so a secret key shipped in frontend code fails visibly instead of being quietly usable.
			const origin = req.headers.origin
			if (origin !== undefined && !isOriginAllowed(origin, principal.allowedOrigins)) {
				throw Errors.forbidden(
					principal.allowedOrigins.length === 0
						? 'This API key is not enabled for browser use. Ask the maintainers to add your origin to it.'
						: `The origin ${origin} is not allowed for this API key`
				)
			}

			if (!hasScope(principal, scope)) throw Errors.forbidden(`This API key does not have the ${scope} scope`)

			const decision = await checkQuota(RedisQuotaStore, principal.consumerId, principal.plan, new Date(), err => {
				recordQuotaStoreError()
				logger.error({ err, consumer: principal.consumerSlug }, 'partner.quota_store_failed')
			})

			if (decision.allowed && decision.degraded) {
				LoggerAPIContext.add({ quota_degraded: true })
			} else if (decision.allowed) {
				res.setHeader('RateLimit-Limit', decision.limit)
				res.setHeader('RateLimit-Remaining', decision.remaining)
				res.setHeader('RateLimit-Reset', decision.resetSeconds)
			} else {
				res.setHeader('Retry-After', decision.retryAfterSeconds)
				res.setHeader('RateLimit-Limit', decision.limit)
				res.setHeader('RateLimit-Remaining', 0)
				res.setHeader('RateLimit-Reset', decision.retryAfterSeconds)

				throw Errors.rateLimited(`The ${decision.window === 'minute' ? 'per-minute' : 'daily'} request limit was reached`, {
					window: decision.window,
					retry_after_seconds: decision.retryAfterSeconds
				})
			}

			next()
		} catch (error) {
			next(error)
		}
	}
}
