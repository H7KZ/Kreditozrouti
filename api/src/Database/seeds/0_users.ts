import { Database } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function seed(mysql: Kysely<Database>) {
    await mysql
        .insertInto('users')
        .values([
            {
                email: 'diar.4fis@gmail.com'
            }
        ])
        .execute()
}
