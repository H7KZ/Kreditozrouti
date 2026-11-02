import type { StudologStatsDTO } from '@kreditozrouti/types'
import * as z from 'zod'
import Config from '@api/Config/Config'
import { Errors } from '@api/Errors'
import { logger } from '@api/logger'

const STUDOLOG_API_URL = 'https://api.studolog.cz/api/v1'
const STUDOLOG_TIMEOUT_MS = 3000
const STUDOLOG_PAUSE_SECONDS = 30

/** International Week reuses one ident for a different topic each run, so its rating describes another course. */
const ROTATING_SUBJECT_PREFIX = 'International Week'

const StudologStatsSchema = z.object({
	name: z.string().optional(),
	score: z.number().nullable(),
	difficulty: z.string().nullable()
})

/** The API runs as a single replica, so one in-process deadline covers every lookup. */
let pausedUntil = 0

function unavailable(details: Record<string, unknown>, pauseSeconds = STUDOLOG_PAUSE_SECONDS) {
	pausedUntil = Date.now() + pauseSeconds * 1000
	logger.warn({ ...details, pause_seconds: pauseSeconds }, 'studolog.stats_failed')

	return Errors.rateLimited('Studolog is unavailable')
}

/**
 * Service for the student ratings Studolog publishes per course ident.
 * A failure pauses every lookup and answers 429, which is not cached, so a blip cannot hide
 * ratings for the length of the response cache and we stop calling a limited or broken upstream.
 */
const StudologService = {
	/** Null when no key is configured or the subject is unknown, unrated, or rotating. */
	async getStats(ident: string): Promise<StudologStatsDTO | null> {
		if (!Config.studolog.apiKey) return null
		if (Date.now() < pausedUntil) throw Errors.rateLimited('Studolog is unavailable')

		const response = await fetch(`${STUDOLOG_API_URL}/subjects/${encodeURIComponent(ident)}/stats`, {
			headers: { Authorization: `Bearer ${Config.studolog.apiKey}` },
			signal: AbortSignal.timeout(STUDOLOG_TIMEOUT_MS)
		}).catch((error: unknown) => {
			throw unavailable({ err: error })
		})

		if (response.status === 404) return null
		if (!response.ok) throw unavailable({ status: response.status }, Number(response.headers.get('Retry-After')) || undefined)

		const parsed = StudologStatsSchema.safeParse(await response.json().catch(() => null))
		if (!parsed.success) throw unavailable({ issues: parsed.error.issues })

		const { name, score, difficulty } = parsed.data
		if (name?.startsWith(ROTATING_SUBJECT_PREFIX)) return null
		if (score === null && difficulty === null) return null

		return { score, difficulty }
	}
}

export default StudologService
