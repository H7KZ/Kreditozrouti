import { LoggerWideEvent } from '@api/Context/LoggerAPIContext'
import { User } from '@api/Database/types'

/**
 * Global type definitions and augmentations.
 */
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        /**
         * Extends the standard Express User interface to match the application's database model.
         */
        interface Locals {
            user: User
            wideEvent: LoggerWideEvent
        }
    }
}
