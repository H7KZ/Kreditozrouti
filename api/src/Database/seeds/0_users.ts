import { Database, UserTable } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function seed(mysql: Kysely<Database>) {
    await mysql
        .insertInto(UserTable._table)
        .values([
            {
                email: 'diar.4fis@gmail.com'
            }
        ])
        .execute()
}
