import { UserTable } from '@api/Database/types'

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface User extends UserTable {}
    }
}
