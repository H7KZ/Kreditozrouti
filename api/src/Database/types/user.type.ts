import { ColumnType, Generated, Selectable } from 'kysely'

export const UserTableName = 'users'
export interface UserTable {
    id: Generated<number>

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    email: string
}

export type User = Selectable<UserTable>
