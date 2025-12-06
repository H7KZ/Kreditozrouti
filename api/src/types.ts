import { User as UserModel } from '@api/Database/types'

/**
 * Global type definitions and augmentations for the runtime environment.
 */
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        /**
         * Extends the standard Express User interface to match the application's database model.
         * Provides strong typing for `req.user` populated by Passport authentication.
         */
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface User extends UserModel {}
    }
}
