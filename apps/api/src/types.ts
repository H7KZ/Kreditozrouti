import type { PartnerPrincipal } from '@kreditozrouti/types'
import { LoggerWideEvent } from '@api/Context/LoggerAPIContext'

/**
 * Global type definitions and augmentations.
 */
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Locals {
			wideEvent: LoggerWideEvent
		}

		interface Request {
			/** Set by `partnerApi()` on `/v1` routes once the API key has been verified. */
			partner?: PartnerPrincipal
		}
	}
}
