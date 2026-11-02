import type { StudologStatsDTO } from '@kreditozrouti/types'
import * as z from 'zod'
import Config from '@api/Config/Config'
import { logger } from '@api/logger'

const STUDOLOG_API_URL = 'https://api.studolog.cz/api/v1'
const STUDOLOG_TIMEOUT_MS = 3000

const StudologStatsSchema = z.object({
	score: z.number().nullable(),
	difficulty: z.string().nullable()
})

/**
 * Service for the student ratings Studolog publishes per course ident.
 * Ratings are optional decoration, so every failure resolves to null instead of throwing.
 */
const StudologService = {
	/** Null when no key is configured, the subject is unknown or unrated, or Studolog cannot be reached. */
	async getStats(ident: string): Promise<StudologStatsDTO | null> {
		if (!Config.studolog.apiKey) return null

		try {
			const response = await fetch(`${STUDOLOG_API_URL}/subjects/${encodeURIComponent(ident)}/stats`, {
				headers: { Authorization: `Bearer ${Config.studolog.apiKey}` },
				signal: AbortSignal.timeout(STUDOLOG_TIMEOUT_MS)
			})

			if (response.status === 404) return null
			if (!response.ok) {
				logger.warn({ status: response.status }, 'studolog.stats_failed')
				return null
			}

			const { score, difficulty } = StudologStatsSchema.parse(await response.json())
			if (score === null && difficulty === null) return null

			return { score, difficulty }
		} catch (error) {
			logger.warn({ err: error }, 'studolog.stats_failed')
			return null
		}
	}
}

export default StudologService
