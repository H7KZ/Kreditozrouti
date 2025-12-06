import { Database } from '@api/Database/types'
import { Kysely } from 'kysely'

/**
 * Populates the database with initial seed data.
 * Inserts a default user record for development or testing purposes.
 *
 * @param mysql - The Kysely database instance used to execute the insertion query.
 */
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
