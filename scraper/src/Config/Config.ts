import path from 'path'
import dotenv from 'dotenv'

// Attempt to load .env files from distribution, root, or package levels
try {
	dotenv.config({
		path: [path.resolve(process.cwd(), '../../../../.env'), path.resolve(process.cwd(), '../.env'), path.resolve(process.cwd(), '.env')]
	})
} catch {
	console.warn('No .env file found, relying on environment variables.')
}

/**
 * Reads a positive number from the environment, falling back to a safe default when the
 * variable is absent, empty or not a usable number. Defaults must stand on their own:
 * a missing env var never means "unlimited".
 */
function numberFromEnv(value: string | undefined, fallback: number): number {
	if (value === undefined || value.trim() === '') return fallback

	const parsed = Number(value)

	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Application configuration interface.
 */
interface Config {
	/** Current runtime environment (e.g., 'development', 'production'). */
	env: string

	/** Redis connection settings. */
	redis: {
		uri: string
		password: string | undefined
	}

	/** InSIS system URLs and settings. */
	insis: {
		baseDomain: string
		catalogUrl: string
		catalogExtendedSearchUrl: string
		studyPlansUrl: string
		harmonogramUrl: string
		rozvrhyViewUrl: string
		defaultReferrer: string

		/**
		 * Global ceiling on outbound requests to InSIS, enforced in Redis so it holds
		 * across replicas, worker concurrency and every job type.
		 * See InSISRateLimitService and docs/adr/0002-global-insis-rate-limit-not-a-concurrency-knob.md.
		 */
		rateLimit: {
			/** Sustained requests per second across the whole deployment. */
			requestsPerSecond: number
			/** Token bucket capacity, i.e. how big a short burst may be. */
			burst: number
			/** How long a single request may wait for a token before it gives up. */
			maxWaitMs: number
		}
	}

	isEnvLocal: () => boolean
	isEnvDevelopment: () => boolean
	isEnvProduction: () => boolean
}

const config: Config = {
	env: process.env.ENV ?? 'development',

	redis: {
		uri: process.env.REDIS_URI ?? '',
		password: process.env.REDIS_PASSWORD
	},

	insis: {
		baseDomain: 'https://insis.vse.cz',
		catalogUrl: 'https://insis.vse.cz/katalog/',
		catalogExtendedSearchUrl: 'https://insis.vse.cz/katalog/index.pl?jak=rozsirene',
		studyPlansUrl: 'https://insis.vse.cz/katalog/plany.pl?lang=cz',
		harmonogramUrl: 'https://insis.vse.cz/student/harmonogram.pl',
		rozvrhyViewUrl: 'https://insis.vse.cz/katalog/rozvrhy_view.pl',
		defaultReferrer: 'https://insis.vse.cz',

		rateLimit: {
			// Default 4 rps is a deliberate reduction, not a measurement of what InSIS can take.
			// Before this limiter existed the observed peak was roughly 2 replicas x 1 worker x 6 BFS
			// = 12 concurrent requests with no pacing whatsoever. InSIS is a university system we do
			// not own and cannot load-test, so the safe default pushes that down to 4 requests per
			// second overall. Raise it only with a reason, and never by adding a concurrency knob on
			// top of the existing fan-out layers (see ADR 0002).
			requestsPerSecond: numberFromEnv(process.env.INSIS_RATE_LIMIT_RPS, 4),

			// A burst of 8 lets one job's fan-out start immediately instead of trickling in,
			// while the sustained rate above still bounds the average load.
			burst: numberFromEnv(process.env.INSIS_RATE_LIMIT_BURST, 8),

			// 30s is long enough to absorb a queue of waiters at 4 rps, short enough that a
			// pathologically backed-up limiter fails the job instead of holding a BullMQ lock.
			maxWaitMs: numberFromEnv(process.env.INSIS_RATE_LIMIT_MAX_WAIT_MS, 30_000)
		}
	},

	isEnvLocal: () => config.env === 'localhost' || config.env === 'local',
	isEnvDevelopment: () => config.env === 'dev' || config.env === 'development',
	isEnvProduction: () => config.env === 'production' || config.env === 'prod'
}

export default config
