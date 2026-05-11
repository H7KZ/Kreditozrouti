import { scraper } from '@api/bullmq'
import { mysql, redis } from '@api/clients'
import { Request, Response } from 'express'
import { sql, SqlBool } from 'kysely'

// Response Types

export interface QueueStats {
	active: number
	waiting: number
	delayed: number
	completed: number
	failed: number
	paused: number
}

export interface SchedulerInfo {
	id: string
	name: string
	pattern: string
	nextRun: string | null
}

export interface DbTotals {
	courses: number
	studyPlans: number
	faculties: number
}

export interface FacultyStats {
	facultyId: string
	facultyTitle: string | null
	courseCount: number
	avgAgeHours: number
	oldestUpdatedAt: string
	newestUpdatedAt: string
}

export interface StaleCourseCount {
	thresholdDays: number
	count: number
}

export interface FailedJob {
	id: string | undefined
	name: string
	failedReason: string | undefined
	processedOn: number | undefined
	data: Record<string, unknown>
}

export interface CompletedJob {
	id: string | undefined
	name: string
	finishedOn: number | undefined
	processedOn: number | undefined
	data: Record<string, unknown>
}

export interface RecentError {
	status: number
	method: string
	path: string
	query?: Record<string, unknown>
	ip?: string
	duration_ms: number
	timestamp: string
}

export interface ErrorMetrics {
	last24h: {
		total4xx: number
		total5xx: number
		byStatus: Record<string, number>
		topPaths: { path: string; count: number }[]
	}
	hourly: {
		hour: string
		errors4xx: number
		errors5xx: number
	}[]
	recent: RecentError[]
}

export interface AdminStatsResponse {
	queue: { request: QueueStats }
	schedulers: SchedulerInfo[]
	database: {
		totals: DbTotals
		facultyBreakdown: FacultyStats[]
		staleCourses: StaleCourseCount[]
		recentlyUpdated: number
	}
	recentJobs: {
		failed: FailedJob[]
		completed: CompletedJob[]
	}
	errorMetrics: ErrorMetrics
}

// Controller

export default async function AdminStatsController(req: Request, res: Response) {
	const [requestCounts, schedulers, failedJobs, completedJobs, totals, facultyBreakdown, staleCounts, recentCount, errorMetrics] = await Promise.all([
		scraper.queue.request.getJobCounts(),
		scraper.queue.request.getJobSchedulers(),
		scraper.queue.request.getFailed(0, 19),
		scraper.queue.request.getCompleted(0, 19),
		getDbTotals(),
		getFacultyBreakdown(),
		getStaleCounts(),
		getRecentlyUpdatedCount(),
		getErrorMetrics()
	])

	return res.json({
		queue: {
			request: requestCounts as unknown as QueueStats
		},
		schedulers: schedulers.map(s => ({
			id: s.key,
			name: s.name ?? s.key,
			pattern: s.pattern ?? '(manual)',
			nextRun: s.next ? new Date(s.next).toISOString() : null
		})),
		database: {
			totals,
			facultyBreakdown,
			staleCourses: staleCounts,
			recentlyUpdated: recentCount
		},
		recentJobs: {
			failed: failedJobs.map(j => ({
				id: j.id,
				name: j.name,
				failedReason: j.failedReason,
				processedOn: j.processedOn,
				data: j.data as unknown as Record<string, unknown>
			})),
			completed: completedJobs.map(j => ({
				id: j.id,
				name: j.name,
				finishedOn: j.finishedOn,
				processedOn: j.processedOn,
				data: j.data as unknown as Record<string, unknown>
			}))
		},
		errorMetrics
	} satisfies AdminStatsResponse)
}

// Error Metrics Helper

async function getErrorMetrics(): Promise<ErrorMetrics> {
	const [hourlyHash, recentRaw] = await Promise.all([
		redis.hgetall('metrics:errors:hourly'),
		redis.lrange('metrics:errors:recent', 0, 49),
	])

	const hash = hourlyHash ?? {}

	// Build last 24 hours of hourly buckets
	const now = new Date()
	const hourly: ErrorMetrics['hourly'] = []
	const last24hByStatus: Record<string, number> = {}

	for (let i = 23; i >= 0; i--) {
		const d = new Date(now.getTime() - i * 3_600_000)
		const hourKey = d.toISOString().slice(0, 13) // "2026-05-11T14"
		const label = d.toISOString().slice(11, 16)  // "14:00"

		let errors4xx = 0
		let errors5xx = 0

		for (const [field, countStr] of Object.entries(hash)) {
			if (!field.startsWith(hourKey + ':')) continue
			const status = parseInt(field.split(':').pop()!)
			const count = parseInt(countStr)
			if (status >= 500) errors5xx += count
			else if (status >= 400) errors4xx += count

			const statusStr = String(status)
			last24hByStatus[statusStr] = (last24hByStatus[statusStr] ?? 0) + count
		}

		hourly.push({ hour: label, errors4xx, errors5xx })
	}

	const total4xx = Object.entries(last24hByStatus)
		.filter(([s]) => parseInt(s) < 500)
		.reduce((sum, [, n]) => sum + n, 0)
	const total5xx = Object.entries(last24hByStatus)
		.filter(([s]) => parseInt(s) >= 500)
		.reduce((sum, [, n]) => sum + n, 0)

	// Parse recent errors
	const recent: RecentError[] = recentRaw
		.map(r => { try { return JSON.parse(r) as RecentError } catch { return null } })
		.filter((r): r is RecentError => r !== null)

	// Top error paths from recent
	const pathCounts: Record<string, number> = {}
	for (const e of recent) {
		pathCounts[e.path] = (pathCounts[e.path] ?? 0) + 1
	}
	const topPaths = Object.entries(pathCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10)
		.map(([path, count]) => ({ path, count }))

	return {
		last24h: { total4xx, total5xx, byStatus: last24hByStatus, topPaths },
		hourly,
		recent,
	}
}

// DB Helpers

async function getDbTotals(): Promise<DbTotals> {
	const [courses, plans, faculties] = await Promise.all([
		mysql
			.selectFrom('insis_courses')
			.select(eb => [eb.fn.countAll<string>().as('count')])
			.executeTakeFirst(),
		mysql
			.selectFrom('insis_study_plans')
			.select(eb => [eb.fn.countAll<string>().as('count')])
			.executeTakeFirst(),
		mysql
			.selectFrom('insis_faculties')
			.select(eb => [eb.fn.countAll<string>().as('count')])
			.executeTakeFirst()
	])
	return {
		courses: Number(courses?.count ?? 0),
		studyPlans: Number(plans?.count ?? 0),
		faculties: Number(faculties?.count ?? 0)
	}
}

async function getFacultyBreakdown(): Promise<FacultyStats[]> {
	const rows = await mysql
		.selectFrom('insis_courses')
		.leftJoin('insis_faculties', 'insis_faculties.id', 'insis_courses.faculty_id')
		.select(eb => [
			'insis_courses.faculty_id',
			sql<string | null>`insis_faculties.title`.as('faculty_title'),
			eb.fn.countAll<string>().as('course_count'),
			sql<string>`AVG(TIMESTAMPDIFF(HOUR, insis_courses.updated_at, NOW()))`.as('avg_age_hours'),
			eb.fn.min('insis_courses.updated_at').as('oldest_updated_at'),
			eb.fn.max('insis_courses.updated_at').as('newest_updated_at')
		])
		.where('insis_courses.faculty_id', 'is not', null)
		.groupBy(['insis_courses.faculty_id', 'insis_faculties.title'])
		.orderBy('insis_courses.faculty_id', 'asc')
		.execute()

	return rows.map(r => ({
		facultyId: r.faculty_id ?? '',
		facultyTitle: r.faculty_title ?? null,
		courseCount: Number(r.course_count),
		avgAgeHours: Math.round(Number(r.avg_age_hours ?? 0)),
		oldestUpdatedAt: r.oldest_updated_at instanceof Date ? r.oldest_updated_at.toISOString() : String(r.oldest_updated_at),
		newestUpdatedAt: r.newest_updated_at instanceof Date ? r.newest_updated_at.toISOString() : String(r.newest_updated_at)
	}))
}

async function getStaleCounts(): Promise<StaleCourseCount[]> {
	const thresholds = [7, 14, 30, 60]
	return Promise.all(
		thresholds.map(async days => {
			const result = await mysql
				.selectFrom('insis_courses')
				.select(eb => [eb.fn.countAll<string>().as('count')])
				.where(sql<SqlBool>`insis_courses.updated_at < DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
				.executeTakeFirst()
			return { thresholdDays: days, count: Number(result?.count ?? 0) }
		})
	)
}

async function getRecentlyUpdatedCount(): Promise<number> {
	const result = await mysql
		.selectFrom('insis_courses')
		.select(eb => [eb.fn.countAll<string>().as('count')])
		.where(sql<SqlBool>`insis_courses.updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`)
		.executeTakeFirst()
	return Number(result?.count ?? 0)
}
