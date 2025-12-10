import { User } from '@api/Database/types'

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Locals {
            user: User
        }
    }
}
