/** One hourly bucket of request counts, as stored in MySQL. */
export interface UsageRow {
	consumerId: number
	keyId: number
	/** Start of the hour, `YYYY-MM-DD HH:00:00` in UTC. */
	hour: string
	/** Route template such as `/v1/courses/:id`, never a concrete id. */
	route: string
	/** 2 for 2xx, 3 for 3xx, 4 for 4xx, 5 for 5xx. */
	statusClass: number
	requestCount: number
	totalDurationMs: number
}

export interface UsageCounts {
	count: number
	durationMs: number
}

/**
 * Counters for hours that may still be filling. The adapter (Redis in apps/api) keeps one hash per hour
 * bucket, so nothing is written to MySQL per request.
 */
export interface UsageCounterStore {
	record(hour: string, field: string, durationMs: number): Promise<void>
	/** Hour buckets that currently hold counters, as returned by `hourBucket`. */
	listHours(): Promise<string[]>
	readHour(hour: string): Promise<Record<string, UsageCounts>>
	dropHour(hour: string): Promise<void>
}

export interface UsageSink {
	/** Adds the counts to existing rows for the same bucket, or inserts them. Must be additive so a retried flush after a partial failure over-counts at worst, never loses data. */
	addHourly(rows: UsageRow[]): Promise<void>
}

export interface UsageEvent {
	consumerId: number
	keyId: number
	route: string
	status: number
	durationMs: number
}

/** Hour bucket id, `YYYY-MM-DDTHH` in UTC. */
export function hourBucket(date: Date): string {
	return date.toISOString().slice(0, 13)
}

/** Converts an hour bucket to the MySQL datetime for the start of that hour. */
export function hourToDatetime(hour: string): string {
	return `${hour.replace('T', ' ')}:00:00`
}

export function statusClassOf(status: number): number {
	return Math.min(5, Math.max(1, Math.floor(status / 100)))
}

// `|` cannot appear in a route template, so it is a safe separator.
export function usageField(event: Pick<UsageEvent, 'consumerId' | 'keyId' | 'route' | 'status'>): string {
	return `${event.consumerId}|${event.keyId}|${statusClassOf(event.status)}|${event.route}`
}

export function parseUsageField(field: string): Pick<UsageRow, 'consumerId' | 'keyId' | 'statusClass' | 'route'> | null {
	const [consumerId, keyId, statusClass, ...route] = field.split('|')
	const parsed = { consumerId: Number(consumerId), keyId: Number(keyId), statusClass: Number(statusClass), route: route.join('|') }

	return Number.isInteger(parsed.consumerId) && Number.isInteger(parsed.keyId) && Number.isInteger(parsed.statusClass) && parsed.route.length > 0
		? parsed
		: null
}

/** Adds one finished request to the current hour. */
export function recordUsage(store: UsageCounterStore, event: UsageEvent, now: Date = new Date()): Promise<void> {
	return store.record(hourBucket(now), usageField(event), event.durationMs)
}

/**
 * Moves every completed hour from the counter store into the sink and drops it from the store.
 * The current hour is left alone because it is still filling. Returns the number of rows written.
 */
export async function flushCompletedHours(store: UsageCounterStore, sink: UsageSink, now: Date = new Date()): Promise<number> {
	const current = hourBucket(now)
	const completed = (await store.listHours()).filter(hour => hour < current).sort()

	let written = 0
	for (const hour of completed) {
		const counts = await store.readHour(hour)

		const rows: UsageRow[] = []
		for (const [field, value] of Object.entries(counts)) {
			const parsed = parseUsageField(field)
			if (!parsed) continue

			rows.push({ ...parsed, hour: hourToDatetime(hour), requestCount: value.count, totalDurationMs: Math.round(value.durationMs) })
		}

		if (rows.length > 0) await sink.addHourly(rows)

		// Dropped only after the sink accepted the rows, so a failed flush is retried on the next run.
		await store.dropHour(hour)
		written += rows.length
	}

	return written
}
