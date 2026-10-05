import type { PartnerUsageDTO } from '@kreditozrouti/types'
import { peekDailyUsage, secondsUntilUtcMidnight } from '@kreditozrouti/core/partner-api'
import { Request, Response } from 'express'
import { sql } from 'kysely'
import { mysql } from '@api/clients'
import { ApiUsageHourlyTable } from '@api/Database/types'
import { Errors } from '@api/Errors'
import { RedisQuotaStore } from '@api/Services/Partner/RedisQuotaStore'
import { parseOrThrow } from './parse'
import { UsageQuerySchema } from './schemas'

/** `GET /v1/usage`: what the calling consumer used and what is left today. */
export const UsageV1Controller = {
	get: async (req: Request, res: Response) => {
		const partner = req.partner
		if (!partner) throw Errors.unauthorized()

		const { days } = parseOrThrow(UsageQuerySchema, req.query)
		const now = new Date()
		const cutoff = new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10)

		const [today, rows] = await Promise.all([
			peekDailyUsage(RedisQuotaStore, partner.consumerId, partner.plan, now),
			mysql
				.selectFrom(ApiUsageHourlyTable._table)
				.select([
					sql<string>`DATE_FORMAT(hour, '%Y-%m-%d')`.as('date'),
					sql<string>`SUM(request_count)`.as('requests'),
					sql<string>`SUM(CASE WHEN status_class >= 4 THEN request_count ELSE 0 END)`.as('errors')
				])
				.where('consumer_id', '=', partner.consumerId)
				.where('hour', '>=', new Date(`${cutoff}T00:00:00Z`))
				.groupBy(sql`DATE_FORMAT(hour, '%Y-%m-%d')`)
				.orderBy('date', 'desc')
				.execute()
		])

		const body: PartnerUsageDTO = {
			consumer: partner.consumerSlug,
			plan: { name: partner.plan.name, requests_per_minute: partner.plan.requestsPerMinute, requests_per_day: partner.plan.requestsPerDay },
			// `used` counts live requests since UTC midnight; `days` below is flushed hourly, so it lags by up to an hour.
			today: { ...today, resets_at: new Date(now.getTime() + secondsUntilUtcMidnight(now) * 1000).toISOString() },
			days: rows.map(r => ({ date: r.date, requests: Number(r.requests), errors: Number(r.errors) }))
		}

		res.json(body)
	}
}
