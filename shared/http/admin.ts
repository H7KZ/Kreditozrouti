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
