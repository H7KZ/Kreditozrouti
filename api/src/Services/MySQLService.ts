import { promises as fs } from 'fs'
import * as path from 'path'
import { mysql } from '@api/clients'
import { FileMigrationProvider, Migrator } from 'kysely'

export class MySQLService {
    static async migrateToLatest() {
        if (!mysql) {
            throw new Error('Database client is not initialized')
        }

        const migrator = new Migrator({
            db: mysql,
            provider: new FileMigrationProvider({
                fs,
                path,
                migrationFolder: path.join(__dirname, '../Database/migrations')
            })
        })

        const { error, results } = await migrator.migrateToLatest()

        results?.forEach(it => {
            if (it.status === 'Success') {
                console.log(`migration "${it.migrationName}" was executed successfully`)
            } else if (it.status === 'Error') {
                console.error(`failed to execute migration "${it.migrationName}"`)
            }
        })

        if (error) {
            console.error('failed to migrate')
            console.error(error)
            process.exit(1)
        }
    }
}
