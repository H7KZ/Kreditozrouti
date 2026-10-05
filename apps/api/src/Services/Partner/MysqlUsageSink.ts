import type { UsageRow, UsageSink } from '@kreditozrouti/core/partner-api'
import { sql } from 'kysely'
import { mysql } from '@api/clients'
import { ApiUsageHourlyTable } from '@api/Database/types'

const CHUNK_SIZE = 500

/** Hourly usage rows are kept this long. Older rows are deleted by the flush job. */
export const USAGE_RETENTION_MONTHS = 13

/** Deletes hourly usage older than the retention window. Returns the number of rows removed. */
export async function pruneUsage(now: Date = new Date()): Promise<number> {
	const cutoff = new Date(now)
	cutoff.setUTCMonth(cutoff.getUTCMonth() - USAGE_RETENTION_MONTHS)

	const result = await mysql.deleteFrom(ApiUsageHourlyTable._table).where('hour', '<', cutoff).executeTakeFirst()
	return Number(result.numDeletedRows)
}

export const MysqlUsageSink: UsageSink = {
	async addHourly(rows: UsageRow[]) {
		for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
			const chunk = rows.slice(i, i + CHUNK_SIZE)

			await mysql
				.insertInto(ApiUsageHourlyTable._table)
				.values(
					chunk.map(r => ({
						consumer_id: r.consumerId,
						key_id: r.keyId,
						hour: r.hour,
						route: r.route,
						status_class: r.statusClass,
						request_count: r.requestCount,
						total_duration_ms: r.totalDurationMs
					}))
				)
				// Additive on purpose: see UsageSink.addHourly.
				.onDuplicateKeyUpdate({
					request_count: sql`request_count + VALUES(request_count)`,
					total_duration_ms: sql`total_duration_ms + VALUES(total_duration_ms)`
				})
				.execute()
		}
	}
}
