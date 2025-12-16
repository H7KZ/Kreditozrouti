import { Database } from '@api/Database/types'
import { Kysely } from 'kysely'

export async function seed(mysql: Kysely<Database>) {
    // Use insertInto with onDuplicateKeyUpdate to make seeding idempotent
    await mysql
        .insertInto('users')
        .values([
            {
                email: 'diar.4fis@gmail.com'
            }
        ])
        .onDuplicateKeyUpdate({
            email: (eb) => eb.ref('email') // Keep existing email if duplicate
        })
        .execute()
}
