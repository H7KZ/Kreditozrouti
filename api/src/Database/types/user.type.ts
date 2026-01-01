import { ColumnType, Generated, Selectable } from 'kysely'

/**
 * Database schema for Users.
 */
export class UserTable {
    static readonly _table = 'users' as const

    id!: Generated<number>

    created_at!: ColumnType<Date, string | undefined, never>
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    email!: string
}

export type User = Selectable<UserTable>
