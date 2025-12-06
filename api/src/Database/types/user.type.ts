import { ColumnType, Generated, Selectable } from 'kysely'

/** Database table name for users. */
export const UserTableName = 'users'

/**
 * Defines the schema structure for the User table.
 */
export interface UserTable {
    /** Auto-generated primary key identifier. */
    id: Generated<number>

    /** Timestamp of record creation. */
    created_at: ColumnType<Date, string | undefined, never>

    /** Timestamp of the last record update. */
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    /** Unique email address of the user. */
    email: string
}

/** Type representing a selected user record. */
export type User = Selectable<UserTable>
