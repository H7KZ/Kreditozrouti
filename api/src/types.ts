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
	}
}
