import { scraper } from '@api/bullmq'
import { mysql } from '@api/clients'
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
}

// Controller

export default async function AdminStatsController(req: Request, res: Response) {
	const [requestCounts, schedulers, failedJobs, completedJobs, totals, facultyBreakdown, staleCounts, recentCount] = await Promise.all([
		scraper.queue.request.getJobCounts(),
		scraper.queue.request.getJobSchedulers(),
		scraper.queue.request.getFailed(0, 19),
		scraper.queue.request.getCompleted(0, 19),
		getDbTotals(),
		getFacultyBreakdown(),
		getStaleCounts(),
		getRecentlyUpdatedCount()
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
		}
	} satisfies AdminStatsResponse)
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
